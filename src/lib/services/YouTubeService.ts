/**
 * YouTubeService — Fetches trending video data from YouTube Data API v3
 *
 * Returns normalised TrendItem[] for consumption by TrendService.
 * Never called directly from routes — always via TrendService.
 *
 * Env: YOUTUBE_API_KEY (server-only)
 *
 * YouTube Data API v3 quota: 10,000 units/day
 * - search.list = 100 units per call
 * - videos.list = 1 unit per call
 * Strategy: use search.list for niche keyword search, then videos.list
 * for statistics on the results. Keeps us well under quota.
 */

import type { TrendItem } from "@/types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Maps user-facing niche labels to YouTube search queries.
 * Falls back to the raw niche string if no mapping exists.
 */
const NICHE_SEARCH_TERMS: Record<string, string> = {
  "Fitness & Health": "fitness workout health tips",
  "Food & Cooking": "cooking recipe food",
  "Fashion & Beauty": "fashion beauty style tips",
  "Tech & Gadgets": "tech gadgets review",
  "Finance & Investing": "finance investing money tips",
  "Travel & Adventure": "travel adventure vlog",
  "Gaming": "gaming gameplay",
  "Education & Learning": "education tutorial learn",
  "Music & Entertainment": "music entertainment",
  "Home & DIY": "home improvement DIY",
  "Pets & Animals": "pets animals cute",
  "Parenting & Family": "parenting family kids",
  "Real Estate": "real estate home buying",
  "Automotive": "cars automotive review",
  "Photography & Videography": "photography videography camera",
  "Business & Entrepreneurship": "business entrepreneur startup",
  "Art & Design": "art design creative",
  "Sports": "sports highlights",
  "Landscaping & Outdoor": "landscaping outdoor garden",
  "HVAC & Home Services": "HVAC home repair plumbing",
};

// YouTube video statistics response
interface YouTubeVideoStats {
  id: string;
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

// YouTube search result
interface YouTubeSearchItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelTitle: string;
    tags?: string[];
  };
}

export class YouTubeService {
  private apiKey: string;

  constructor() {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new Error("YOUTUBE_API_KEY is not set");
    this.apiKey = key;
  }

  /**
   * Fetch trending videos for a niche.
   * Uses search.list (sorted by relevance, filtered to recent uploads)
   * then enriches with statistics from videos.list.
   */
  async fetchTrending(niche: string, maxResults = 10): Promise<TrendItem[]> {
    const query = NICHE_SEARCH_TERMS[niche] ?? niche;

    // Step 1: Search for recent videos matching the niche
    const searchResults = await this.searchVideos(query, maxResults);

    if (searchResults.length === 0) return [];

    // Step 2: Fetch statistics for all returned videos in one batch
    const videoIds = searchResults
      .map((item) => item.id.videoId)
      .filter((id): id is string => !!id);

    const statsMap = await this.getVideoStats(videoIds);

    // Step 3: Normalise to TrendItem[]
    const now = new Date().toISOString();
    return searchResults
      .filter((item) => item.id.videoId)
      .map((item): TrendItem => {
        const videoId = item.id.videoId!;
        const stats = statsMap.get(videoId);
        const views = parseInt(stats?.statistics.viewCount ?? "0", 10);
        const likes = parseInt(stats?.statistics.likeCount ?? "0", 10);
        const comments = parseInt(stats?.statistics.commentCount ?? "0", 10);

        return {
          id: `yt_${videoId}`,
          platform: "youtube",
          title: item.snippet.title,
          description: this.truncate(item.snippet.description, 300),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          engagementScore: this.calculateEngagement(views, likes, comments),
          momentum: this.estimateMomentum(item.snippet.publishedAt),
          hashtags: this.extractHashtags(item.snippet.title, item.snippet.description),
          fetchedAt: now,
        };
      });
  }

  /**
   * YouTube search.list — costs 100 quota units per call.
   * Filters to videos published in the last 7 days, sorted by viewCount
   * to surface trending content.
   */
  private async searchVideos(query: string, maxResults: number): Promise<YouTubeSearchItem[]> {
    const publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      order: "viewCount",
      maxResults: String(Math.min(maxResults, 25)),
      publishedAfter,
      relevanceLanguage: "en",
      key: this.apiKey,
    });

    const url = `${YOUTUBE_API_BASE}/search?${params}`;
    const res = await this.fetchWithTimeout(url);

    if (!res.ok) {
      if (res.status === 403) {
        console.error("YouTube API quota exceeded or forbidden", {
          status: res.status,
          statusText: res.statusText,
        });
        return []; // Graceful degradation — TrendService will use other sources
      }
      throw new Error(`YouTube search failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return (data.items ?? []) as YouTubeSearchItem[];
  }

  /**
   * YouTube videos.list — costs 1 quota unit per call.
   * Batch fetch statistics for up to 50 video IDs.
   */
  private async getVideoStats(videoIds: string[]): Promise<Map<string, YouTubeVideoStats>> {
    if (videoIds.length === 0) return new Map();

    const params = new URLSearchParams({
      part: "statistics",
      id: videoIds.join(","),
      key: this.apiKey,
    });

    const url = `${YOUTUBE_API_BASE}/videos?${params}`;
    const res = await this.fetchWithTimeout(url);

    if (!res.ok) {
      console.error("YouTube videos.list failed", { status: res.status });
      return new Map(); // Stats are nice-to-have, don't fail the whole fetch
    }

    const data = await res.json();
    const items = (data.items ?? []) as YouTubeVideoStats[];
    return new Map(items.map((v) => [v.id, v]));
  }

  /**
   * Normalise engagement to a 0–100 score.
   * Weighted: views (50%), likes (30%), comments (20%).
   * Capped so a viral video with 10M views scores ~100.
   */
  private calculateEngagement(views: number, likes: number, comments: number): number {
    const viewScore = Math.min(views / 100_000, 1) * 50;
    const likeScore = Math.min(likes / 5_000, 1) * 30;
    const commentScore = Math.min(comments / 1_000, 1) * 20;
    return Math.round(viewScore + likeScore + commentScore);
  }

  /**
   * Estimate momentum based on publish date.
   * <24h = rising, 1–3 days = peak, 3–7 days = declining.
   */
  private estimateMomentum(publishedAt: string): "rising" | "peak" | "declining" {
    const ageMs = Date.now() - new Date(publishedAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours < 24) return "rising";
    if (ageHours < 72) return "peak";
    return "declining";
  }

  /**
   * Extract hashtag-like keywords from title + description.
   * Pulls actual #hashtags and falls back to significant words.
   */
  private extractHashtags(title: string, description: string): string[] {
    const combined = `${title} ${description}`;
    const tagRegex = /#[\w]+/g;
    const found = combined.match(tagRegex) ?? [];

    // Deduplicate and lowercase
    const tags = [...new Set(found.map((t) => t.toLowerCase()))];
    return tags.slice(0, 10);
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + "…";
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(url, { signal: controller.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error("YouTube API request timed out", { url: url.split("?")[0] });
        throw new Error("YouTube API request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
