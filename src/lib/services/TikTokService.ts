/**
 * TikTokService — Fetches trending hashtags + videos via RapidAPI scraper
 *
 * Returns normalised TrendItem[] for consumption by TrendService.
 * Never called directly from routes — always via TrendService.
 *
 * RapidAPI endpoint varies by provider. Using "tiktok-scraper7" as
 * the default — swap the host/path if you pick a different provider.
 *
 * Env: RAPIDAPI_KEY (server-only)
 */

import type { TrendItem } from "@/types";

const REQUEST_TIMEOUT_MS = 10_000;
const RAPIDAPI_HOST = "tiktok-scraper7.p.rapidapi.com";

/**
 * Maps niche labels to TikTok search keywords.
 */
const NICHE_KEYWORDS: Record<string, string> = {
  "Fitness & Health": "fitness workout gym",
  "Food & Cooking": "cooking recipe foodtok",
  "Fashion & Beauty": "fashion beauty ootd",
  "Tech & Gadgets": "tech gadgets techtok",
  "Finance & Investing": "finance investing fintok",
  "Travel & Adventure": "travel wanderlust adventure",
  "Gaming": "gaming gamer gameplay",
  "Education & Learning": "education learnontiktok study",
  "Music & Entertainment": "music entertainment dance",
  "Home & DIY": "diy homedecor homeimprovement",
  "Pets & Animals": "pets dog cat animals",
  "Parenting & Family": "parenting momtok family",
  "Real Estate": "realestate housetour realtor",
  "Automotive": "cars cartok automotive",
  "Photography & Videography": "photography videography camera",
  "Business & Entrepreneurship": "business entrepreneur smallbusiness",
  "Art & Design": "art design creative arttok",
  "Sports": "sports athlete highlights",
  "Landscaping & Outdoor": "landscaping garden lawn outdoor",
  "HVAC & Home Services": "hvac plumbing homerepair trades",
};

// RapidAPI TikTok search response shape (varies by provider)
interface TikTokVideo {
  id?: string;
  video_id?: string;
  title?: string;
  desc?: string;
  play_count?: number;
  digg_count?: number;
  comment_count?: number;
  share_count?: number;
  create_time?: number;
  author?: { unique_id?: string };
  hashtags?: Array<{ name?: string }>;
}

export class TikTokService {
  private apiKey: string;
  private available = true; // fallback flag — set to false if scraper is down

  constructor() {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) throw new Error("RAPIDAPI_KEY is not set");
    this.apiKey = key;
  }

  /**
   * Whether this service is currently operational.
   * TrendService checks this before calling — if false,
   * it skips TikTok and relies on Claude web_search fallback.
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Fetch trending TikTok videos for a niche keyword.
   * Returns normalised TrendItem[].
   * On failure, marks service as unavailable and returns [].
   */
  async fetchTrending(niche: string, maxResults = 10): Promise<TrendItem[]> {
    if (!this.available) return [];

    const keyword = NICHE_KEYWORDS[niche] ?? niche;

    try {
      const videos = await this.searchVideos(keyword, maxResults);
      const now = new Date().toISOString();

      return videos.map((v): TrendItem => {
        const videoId = v.id ?? v.video_id ?? crypto.randomUUID();
        const plays = v.play_count ?? 0;
        const likes = v.digg_count ?? 0;
        const comments = v.comment_count ?? 0;
        const shares = v.share_count ?? 0;

        return {
          id: `tiktok_${videoId}`,
          platform: "tiktok",
          title: v.title ?? v.desc ?? "Untitled TikTok",
          description: this.truncate(v.desc ?? "", 300),
          url: v.author?.unique_id
            ? `https://www.tiktok.com/@${v.author.unique_id}/video/${videoId}`
            : null,
          engagementScore: this.calculateEngagement(plays, likes, comments, shares),
          momentum: this.estimateMomentum(v.create_time),
          hashtags: this.extractHashtags(v),
          fetchedAt: now,
        };
      });
    } catch (err) {
      console.error("TikTokService.fetchTrending failed, marking unavailable", err);
      this.available = false;
      return [];
    }
  }

  /**
   * Search TikTok via RapidAPI scraper.
   * Endpoint path and response shape depend on the specific RapidAPI
   * provider — adjust if you switch providers.
   */
  private async searchVideos(keyword: string, maxResults: number): Promise<TikTokVideo[]> {
    const params = new URLSearchParams({
      keywords: keyword,
      count: String(Math.min(maxResults, 20)),
      cursor: "0",
      publish_time: "7", // last 7 days
      sort_type: "0",    // relevance
    });

    const url = `https://${RAPIDAPI_HOST}/feed/search?${params}`;
    const res = await this.fetchWithTimeout(url);

    if (!res.ok) {
      if (res.status === 429) {
        console.warn("TikTok RapidAPI rate limit hit");
        this.available = false;
        return [];
      }
      throw new Error(`TikTok search failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    // Response shape varies — try common keys
    const videos = data.data?.videos ?? data.data ?? data.videos ?? [];
    return (videos as TikTokVideo[]).slice(0, maxResults);
  }

  /**
   * Normalise engagement to 0–100.
   * TikTok weighting: plays (40%), likes (25%), comments (15%), shares (20%).
   * A video with 1M plays scores ~100.
   */
  private calculateEngagement(
    plays: number,
    likes: number,
    comments: number,
    shares: number
  ): number {
    const playScore = Math.min(plays / 1_000_000, 1) * 40;
    const likeScore = Math.min(likes / 50_000, 1) * 25;
    const commentScore = Math.min(comments / 5_000, 1) * 15;
    const shareScore = Math.min(shares / 10_000, 1) * 20;
    return Math.round(playScore + likeScore + commentScore + shareScore);
  }

  private estimateMomentum(createTime?: number): "rising" | "peak" | "declining" {
    if (!createTime) return "peak";
    const ageMs = Date.now() - createTime * 1000;
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 24) return "rising";
    if (ageHours < 72) return "peak";
    return "declining";
  }

  private extractHashtags(video: TikTokVideo): string[] {
    const tags: Set<string> = new Set();

    // From structured hashtag array
    if (video.hashtags) {
      video.hashtags.forEach((h) => {
        if (h.name) tags.add(`#${h.name.toLowerCase()}`);
      });
    }

    // From description text
    const desc = video.desc ?? video.title ?? "";
    const hashtagRegex = /#[\w]+/g;
    const found = desc.match(hashtagRegex);
    if (found) found.forEach((t) => tags.add(t.toLowerCase()));

    return [...tags].slice(0, 10);
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + "…";
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: {
          "x-rapidapi-key": this.apiKey,
          "x-rapidapi-host": RAPIDAPI_HOST,
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error("TikTok RapidAPI request timed out");
        throw new Error("TikTok API request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
