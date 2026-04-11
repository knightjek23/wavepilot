/**
 * TrendService — Orchestrator for all platform trend services
 *
 * Single entry point: getTrends(niche, platforms)
 *
 * Fallback chain:
 * 1. CacheService — returns cached data if fresh (24h TTL)
 * 2. Live API fetch — YouTube, Reddit, TikTok, Twitter in parallel
 * 3. Claude web_search — if all scrapers fail, ClaudeService can
 *    still use web_search tool to find trends (handled at prompt level)
 *
 * Each platform fetch runs independently — a single platform failure
 * does NOT fail the entire request. We return whatever we got.
 */

import type { Platform, TrendItem, TrendPayload } from "@/types";
import { CacheService } from "./CacheService";
import { YouTubeService } from "./YouTubeService";
import { RedditService } from "./RedditService";
import { TikTokService } from "./TikTokService";
import { TwitterService } from "./TwitterService";

/**
 * Result of a getTrends call, including metadata about
 * which sources succeeded/failed for observability.
 */
export interface TrendResult {
  items: TrendItem[];
  fromCache: boolean;
  platformResults: Record<string, "ok" | "failed" | "skipped">;
}

export class TrendService {
  private cache: CacheService;
  private youtube: YouTubeService | null = null;
  private reddit: RedditService | null = null;
  private tiktok: TikTokService | null = null;
  private twitter: TwitterService | null = null;

  constructor() {
    this.cache = new CacheService();

    // Lazy-init each service — if env vars are missing, skip gracefully
    try { this.youtube = new YouTubeService(); } catch { /* skip */ }
    try { this.reddit = new RedditService(); } catch { /* skip */ }
    try { this.tiktok = new TikTokService(); } catch { /* skip */ }
    try { this.twitter = new TwitterService(); } catch { /* skip */ }
  }

  /**
   * Main entry point. Fetches trends for the given niche and platforms.
   *
   * 1. Check cache
   * 2. If miss → fetch from all requested platforms in parallel
   * 3. Merge, deduplicate, sort by engagement
   * 4. Write result to cache
   */
  async getTrends(niche: string, platforms: Platform[]): Promise<TrendResult> {
    const cacheKey = CacheService.buildKey(niche, platforms);

    // --- Step 1: Cache check ---
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return {
        items: cached.items,
        fromCache: true,
        platformResults: Object.fromEntries(platforms.map((p) => [p, "ok"])),
      };
    }

    // --- Step 2: Fetch from platforms in parallel ---
    const platformResults: Record<string, "ok" | "failed" | "skipped"> = {};
    const fetchPromises: Promise<TrendItem[]>[] = [];

    for (const platform of platforms) {
      const fetcher = this.getFetcher(platform, niche);

      if (!fetcher) {
        platformResults[platform] = "skipped";
        continue;
      }

      fetchPromises.push(
        fetcher
          .then((items) => {
            platformResults[platform] = items.length > 0 ? "ok" : "failed";
            return items;
          })
          .catch((err) => {
            console.error(`TrendService: ${platform} fetch failed`, err);
            platformResults[platform] = "failed";
            return [] as TrendItem[];
          })
      );
    }

    const results = await Promise.all(fetchPromises);
    const allItems = results.flat();

    // --- Step 3: Deduplicate + sort ---
    const deduped = this.deduplicateItems(allItems);
    const sorted = deduped.sort((a, b) => b.engagementScore - a.engagementScore);

    // --- Step 4: Write to cache (non-blocking) ---
    if (sorted.length > 0) {
      const payload: TrendPayload = {
        niche,
        platforms,
        items: sorted,
        fetchedAt: new Date().toISOString(),
      };
      // Fire and forget — don't block the response on cache write
      this.cache.set(cacheKey, payload).catch((err) => {
        console.error("TrendService: cache write failed", err);
      });
    }

    return {
      items: sorted,
      fromCache: false,
      platformResults,
    };
  }

  /**
   * Route a platform to its service's fetchTrending method.
   * Returns null if the service isn't configured or the platform
   * isn't supported.
   */
  private getFetcher(platform: Platform, niche: string): Promise<TrendItem[]> | null {
    switch (platform) {
      case "youtube":
        return this.youtube?.fetchTrending(niche) ?? null;
      case "reddit":
        return this.reddit?.fetchTrending(niche) ?? null;
      case "tiktok":
        if (this.tiktok && this.tiktok.isAvailable()) {
          return this.tiktok.fetchTrending(niche);
        }
        return null;
      case "twitter":
        if (this.twitter && this.twitter.isAvailable()) {
          return this.twitter.fetchTrending(niche);
        }
        return null;
      // Instagram, LinkedIn, Facebook don't have scraper services yet.
      // Claude web_search will cover these at prompt level.
      case "instagram":
      case "linkedin":
      case "facebook":
        return null;
      default:
        return null;
    }
  }

  /**
   * Remove duplicate trend items across platforms.
   * Two items are considered duplicates if their titles are >80% similar
   * (simple normalized comparison). Keeps the one with higher engagement.
   */
  private deduplicateItems(items: TrendItem[]): TrendItem[] {
    const seen: TrendItem[] = [];

    for (const item of items) {
      const normalizedTitle = this.normalizeText(item.title);
      const isDuplicate = seen.some((existing) => {
        const existingNorm = this.normalizeText(existing.title);
        return this.similarity(normalizedTitle, existingNorm) > 0.8;
      });

      if (!isDuplicate) {
        seen.push(item);
      } else {
        // Replace if this one has higher engagement
        const dupeIdx = seen.findIndex((existing) => {
          const existingNorm = this.normalizeText(existing.title);
          return this.similarity(normalizedTitle, existingNorm) > 0.8;
        });
        if (dupeIdx >= 0 && item.engagementScore > seen[dupeIdx].engagementScore) {
          seen[dupeIdx] = item;
        }
      }
    }

    return seen;
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  }

  /**
   * Simple word-overlap similarity (Jaccard index).
   * Good enough for catching cross-platform duplicates.
   */
  private similarity(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/).filter(Boolean));
    const wordsB = new Set(b.split(/\s+/).filter(Boolean));
    if (wordsA.size === 0 && wordsB.size === 0) return 1;

    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersection++;
    }

    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }
}
