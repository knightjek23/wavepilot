/**
 * RedditService — Fetches top posts from niche-relevant subreddits
 *
 * Returns normalised TrendItem[] for consumption by TrendService.
 * Never called directly from routes — always via TrendService.
 *
 * Auth: Reddit OAuth2 "Application Only" flow (client_credentials).
 * Rate limit: 100 requests/minute with OAuth token.
 *
 * Env: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET (server-only)
 */

import type { TrendItem } from "@/types";

const REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_BASE = "https://oauth.reddit.com";
const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT = "wavepilot:v0.1.0 (by /u/wavepilot-bot)";

/**
 * Maps user-facing niche labels to subreddit lists.
 * Each niche maps to 2–4 subreddits to get a good cross-section.
 * Falls back to a search-based approach if niche isn't mapped.
 */
const NICHE_SUBREDDITS: Record<string, string[]> = {
  "Fitness & Health": ["fitness", "bodyweightfitness", "running", "healthyfood"],
  "Food & Cooking": ["cooking", "food", "mealprep", "recipes"],
  "Fashion & Beauty": ["fashion", "femalefashionadvice", "malefashionadvice", "beauty"],
  "Tech & Gadgets": ["technology", "gadgets", "android", "apple"],
  "Finance & Investing": ["personalfinance", "investing", "stocks", "financialindependence"],
  "Travel & Adventure": ["travel", "solotravel", "backpacking", "travelphotography"],
  "Gaming": ["gaming", "pcgaming", "games", "indiegaming"],
  "Education & Learning": ["learnprogramming", "education", "todayilearned", "explainlikeimfive"],
  "Music & Entertainment": ["music", "listentothis", "hiphopheads", "indieheads"],
  "Home & DIY": ["diy", "homeimprovement", "woodworking", "interiordesign"],
  "Pets & Animals": ["pets", "dogs", "cats", "aww"],
  "Parenting & Family": ["parenting", "daddit", "mommit", "beyondthebump"],
  "Real Estate": ["realestate", "firsttimehomebuyer", "realestateinvesting", "homeowners"],
  "Automotive": ["cars", "autos", "electricvehicles", "mechanicadvice"],
  "Photography & Videography": ["photography", "videography", "filmmakers", "cameras"],
  "Business & Entrepreneurship": ["entrepreneur", "smallbusiness", "startups", "sidehustle"],
  "Art & Design": ["art", "design", "graphicdesign", "digitalart"],
  "Sports": ["sports", "nba", "soccer", "nfl"],
  "Landscaping & Outdoor": ["landscaping", "gardening", "lawncare", "outdoors"],
  "HVAC & Home Services": ["hvac", "plumbing", "electricians", "homeimprovement"],
};

// Reddit listing child structure
interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    score: number;
    num_comments: number;
    ups: number;
    created_utc: number;
    subreddit: string;
    link_flair_text?: string;
  };
}

export class RedditService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    const id = process.env.REDDIT_CLIENT_ID;
    const secret = process.env.REDDIT_CLIENT_SECRET;
    if (!id || !secret) throw new Error("Reddit API credentials not set");
    this.clientId = id;
    this.clientSecret = secret;
  }

  /**
   * Fetch trending posts for a niche.
   * Pulls top posts from the last 24h across mapped subreddits,
   * then normalises to TrendItem[].
   */
  async fetchTrending(niche: string, maxResults = 10): Promise<TrendItem[]> {
    await this.ensureAccessToken();

    const subreddits = NICHE_SUBREDDITS[niche];
    let posts: RedditPost[];

    if (subreddits) {
      // Known niche — fetch from mapped subreddits
      posts = await this.fetchFromSubreddits(subreddits, maxResults);
    } else {
      // Unknown niche — search Reddit directly
      posts = await this.searchPosts(niche, maxResults);
    }

    const now = new Date().toISOString();
    return posts.map((post): TrendItem => ({
      id: `reddit_${post.data.id}`,
      platform: "reddit",
      title: post.data.title,
      description: this.truncate(post.data.selftext || `r/${post.data.subreddit}`, 300),
      url: `https://www.reddit.com${post.data.permalink}`,
      engagementScore: this.calculateEngagement(post.data.score, post.data.num_comments),
      momentum: this.estimateMomentum(post.data.created_utc),
      hashtags: this.extractTags(post.data.subreddit, post.data.link_flair_text, post.data.title),
      fetchedAt: now,
    }));
  }

  /**
   * Reddit OAuth2 Application Only flow.
   * Tokens last 1 hour. Re-authenticates when expired.
   */
  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const res = await this.fetchWithTimeout(REDDIT_AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      throw new Error(`Reddit auth failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    // Expire 5 minutes early to avoid edge cases
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  }

  /**
   * Fetch top posts from the past 24 hours across multiple subreddits.
   * Uses the multi-subreddit syntax: /r/sub1+sub2+sub3/top
   */
  private async fetchFromSubreddits(subreddits: string[], maxResults: number): Promise<RedditPost[]> {
    const multi = subreddits.join("+");
    const url = `${REDDIT_API_BASE}/r/${multi}/top?t=day&limit=${Math.min(maxResults, 25)}`;

    const res = await this.authedFetch(url);
    if (!res.ok) {
      console.error("Reddit subreddit fetch failed", { status: res.status, subreddits });
      return [];
    }

    const data = await res.json();
    return (data.data?.children ?? []) as RedditPost[];
  }

  /**
   * Search Reddit for posts matching a niche query.
   * Fallback when no subreddit mapping exists.
   */
  private async searchPosts(query: string, maxResults: number): Promise<RedditPost[]> {
    const params = new URLSearchParams({
      q: query,
      sort: "top",
      t: "day",
      limit: String(Math.min(maxResults, 25)),
      type: "link",
    });

    const url = `${REDDIT_API_BASE}/search?${params}`;
    const res = await this.authedFetch(url);

    if (!res.ok) {
      console.error("Reddit search failed", { status: res.status, query });
      return [];
    }

    const data = await res.json();
    return (data.data?.children ?? []) as RedditPost[];
  }

  /**
   * Normalise engagement to 0–100.
   * Reddit scoring: upvotes (60%), comments (40%).
   * A post with 10K upvotes and 1K comments scores ~100.
   */
  private calculateEngagement(score: number, comments: number): number {
    const scoreComponent = Math.min(score / 10_000, 1) * 60;
    const commentComponent = Math.min(comments / 1_000, 1) * 40;
    return Math.round(scoreComponent + commentComponent);
  }

  /**
   * Estimate momentum based on post age.
   * <6h = rising, 6–18h = peak, 18–24h = declining.
   */
  private estimateMomentum(createdUtc: number): "rising" | "peak" | "declining" {
    const ageMs = Date.now() - createdUtc * 1000;
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours < 6) return "rising";
    if (ageHours < 18) return "peak";
    return "declining";
  }

  /**
   * Build pseudo-hashtags from subreddit name, flair, and title keywords.
   * Reddit doesn't have hashtags, so we synthesize them.
   */
  private extractTags(subreddit: string, flair: string | undefined, title: string): string[] {
    const tags: Set<string> = new Set();

    tags.add(`#${subreddit.toLowerCase()}`);

    if (flair) {
      tags.add(`#${flair.toLowerCase().replace(/\s+/g, "")}`);
    }

    // Pull any existing hashtags from the title
    const hashtagRegex = /#[\w]+/g;
    const titleTags = title.match(hashtagRegex);
    if (titleTags) {
      titleTags.forEach((t) => tags.add(t.toLowerCase()));
    }

    return [...tags].slice(0, 10);
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + "…";
  }

  private async authedFetch(url: string): Promise<Response> {
    return this.fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "User-Agent": USER_AGENT,
      },
    });
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error("Reddit API request timed out", { url: url.split("?")[0] });
        throw new Error("Reddit API request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
