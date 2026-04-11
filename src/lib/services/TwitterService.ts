/**
 * TwitterService — Fetches trending topics + hashtags via RapidAPI scraper
 *
 * Returns normalised TrendItem[] for consumption by TrendService.
 * Never called directly from routes — always via TrendService.
 *
 * Uses "twitter-api47" RapidAPI provider — swap host/path if you
 * pick a different one.
 *
 * Env: RAPIDAPI_KEY (server-only)
 */

import type { TrendItem } from "@/types";

const REQUEST_TIMEOUT_MS = 10_000;
const RAPIDAPI_HOST = "twitter-api47.p.rapidapi.com";

/**
 * Maps niche labels to Twitter/X search keywords.
 */
const NICHE_KEYWORDS: Record<string, string> = {
  "Fitness & Health": "fitness OR workout OR gym",
  "Food & Cooking": "cooking OR recipe OR foodie",
  "Fashion & Beauty": "fashion OR beauty OR style",
  "Tech & Gadgets": "tech OR gadgets OR AI",
  "Finance & Investing": "finance OR investing OR stocks",
  "Travel & Adventure": "travel OR adventure OR wanderlust",
  "Gaming": "gaming OR esports OR gamer",
  "Education & Learning": "education OR learning OR study",
  "Music & Entertainment": "music OR entertainment OR concert",
  "Home & DIY": "DIY OR homeimprovement OR renovation",
  "Pets & Animals": "pets OR dogs OR cats",
  "Parenting & Family": "parenting OR family OR kids",
  "Real Estate": "realestate OR housing OR realtor",
  "Automotive": "cars OR automotive OR EV",
  "Photography & Videography": "photography OR videography OR camera",
  "Business & Entrepreneurship": "business OR startup OR entrepreneur",
  "Art & Design": "art OR design OR creative",
  "Sports": "sports OR NFL OR NBA",
  "Landscaping & Outdoor": "landscaping OR gardening OR outdoor",
  "HVAC & Home Services": "HVAC OR plumbing OR homerepair",
};

// RapidAPI Twitter search response shape (varies by provider)
interface TwitterTweet {
  tweet_id?: string;
  rest_id?: string;
  text?: string;
  full_text?: string;
  favorite_count?: number;
  retweet_count?: number;
  reply_count?: number;
  quote_count?: number;
  created_at?: string;
  user?: {
    screen_name?: string;
  };
  entities?: {
    hashtags?: Array<{ text?: string }>;
  };
}

export class TwitterService {
  private apiKey: string;
  private available = true;

  constructor() {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) throw new Error("RAPIDAPI_KEY is not set");
    this.apiKey = key;
  }

  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Fetch trending tweets for a niche.
   * Returns normalised TrendItem[].
   */
  async fetchTrending(niche: string, maxResults = 10): Promise<TrendItem[]> {
    if (!this.available) return [];

    const query = NICHE_KEYWORDS[niche] ?? niche;

    try {
      const tweets = await this.searchTweets(query, maxResults);
      const now = new Date().toISOString();

      return tweets.map((t): TrendItem => {
        const tweetId = t.tweet_id ?? t.rest_id ?? crypto.randomUUID();
        const likes = t.favorite_count ?? 0;
        const retweets = t.retweet_count ?? 0;
        const replies = t.reply_count ?? 0;
        const quotes = t.quote_count ?? 0;
        const text = t.full_text ?? t.text ?? "";

        return {
          id: `twitter_${tweetId}`,
          platform: "twitter",
          title: this.truncate(text, 140),
          description: this.truncate(text, 300),
          url: t.user?.screen_name
            ? `https://x.com/${t.user.screen_name}/status/${tweetId}`
            : null,
          engagementScore: this.calculateEngagement(likes, retweets, replies, quotes),
          momentum: this.estimateMomentum(t.created_at),
          hashtags: this.extractHashtags(t),
          fetchedAt: now,
        };
      });
    } catch (err) {
      console.error("TwitterService.fetchTrending failed, marking unavailable", err);
      this.available = false;
      return [];
    }
  }

  private async searchTweets(query: string, maxResults: number): Promise<TwitterTweet[]> {
    const params = new URLSearchParams({
      query: `${query} min_faves:100`,
      count: String(Math.min(maxResults, 20)),
      type: "Top",
    });

    const url = `https://${RAPIDAPI_HOST}/v2/search?${params}`;
    const res = await this.fetchWithTimeout(url);

    if (!res.ok) {
      if (res.status === 429) {
        console.warn("Twitter RapidAPI rate limit hit");
        this.available = false;
        return [];
      }
      throw new Error(`Twitter search failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const tweets = data.tweets ?? data.data ?? data.results ?? [];
    return (tweets as TwitterTweet[]).slice(0, maxResults);
  }

  /**
   * Normalise engagement to 0–100.
   * Twitter weighting: likes (35%), retweets (30%), replies (15%), quotes (20%).
   */
  private calculateEngagement(
    likes: number,
    retweets: number,
    replies: number,
    quotes: number
  ): number {
    const likeScore = Math.min(likes / 10_000, 1) * 35;
    const rtScore = Math.min(retweets / 5_000, 1) * 30;
    const replyScore = Math.min(replies / 1_000, 1) * 15;
    const quoteScore = Math.min(quotes / 2_000, 1) * 20;
    return Math.round(likeScore + rtScore + replyScore + quoteScore);
  }

  private estimateMomentum(createdAt?: string): "rising" | "peak" | "declining" {
    if (!createdAt) return "peak";
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 6) return "rising";
    if (ageHours < 24) return "peak";
    return "declining";
  }

  private extractHashtags(tweet: TwitterTweet): string[] {
    const tags: Set<string> = new Set();

    if (tweet.entities?.hashtags) {
      tweet.entities.hashtags.forEach((h) => {
        if (h.text) tags.add(`#${h.text.toLowerCase()}`);
      });
    }

    const text = tweet.full_text ?? tweet.text ?? "";
    const found = text.match(/#[\w]+/g);
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
        console.error("Twitter RapidAPI request timed out");
        throw new Error("Twitter API request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
