/**
 * ClaudeService — Builds prompts + calls Anthropic API for plan generation
 *
 * Model: claude-sonnet-4-20250514 with web_search tool enabled.
 * web_search acts as fallback when scraper APIs fail to return data.
 *
 * Three output types, each with a tailored system prompt:
 * 1. Weekly Content Calendar — 7-day posting schedule
 * 2. Trend Report + Post Ideas — top trends + angles
 * 3. Full Growth Strategy — 30-day roadmap
 *
 * Env: ANTHROPIC_API_KEY (server-only)
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  OutputType,
  TrendItem,
  UserProfile,
  CaptionItem,
  CaptionVibe,
  Platform,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

// Platform-specific caption guidance — keeps output platform-appropriate
const PLATFORM_GUIDANCE: Record<Platform, string> = {
  tiktok:
    "TikTok: hooks under 8 words, captions 1-2 sentences, 3-5 hashtags mixing niche + trending.",
  instagram:
    "Instagram: hooks are the first line before 'more', captions 2-4 sentences with a CTA, 5-10 hashtags.",
  youtube:
    "YouTube Shorts: hooks that promise value in the first 3 seconds, captions 1-3 sentences, 3-5 hashtags.",
  reddit:
    "Reddit: hooks work as post titles (avoid clickbait, be specific), captions are posts 2-4 sentences, no hashtags (use subreddit context in caption).",
  twitter:
    "Twitter/X: hooks ARE the post (280 char limit), captions must fit with any hashtags inline, 1-3 hashtags max.",
  linkedin:
    "LinkedIn: hooks that hint at a business insight, captions 3-5 sentences with line breaks for scannability, 3-5 professional hashtags.",
  facebook:
    "Facebook: hooks are conversational, captions 2-4 sentences that invite discussion, 2-4 hashtags.",
};

const VIBE_GUIDANCE: Record<CaptionVibe, string> = {
  educational: "Informative. Teach something in each hook. Lead with a specific insight, not a generic claim.",
  funny: "Playful and self-aware. Relatable humor over jokes. Avoid forced puns.",
  bold: "Strong point of view. Take a stance. Challenge a common belief in the niche.",
  story: "Narrative. Start in media res or with a turning point. Curiosity gap in the hook.",
  hype: "High energy. Launch-style. Urgency and exclusivity without being salesy.",
};

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Build a prompt tailored to the output type.
   * Includes user profile context and any trend data we fetched.
   */
  buildPrompt(
    profile: UserProfile,
    trends: TrendItem[],
    outputType: OutputType
  ): { system: string; user: string } {
    const trendSummary = this.formatTrends(trends);
    const profileSummary = this.formatProfile(profile);

    const system = this.getSystemPrompt(outputType);
    const user = this.getUserPrompt(outputType, profileSummary, trendSummary);

    return { system, user };
  }

  /**
   * Call the Anthropic API with web_search tool enabled.
   * Returns clean markdown content and token usage.
   */
  async generatePlan(
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ content: string; promptTokens: number }> {
    // web_search_20250305 is supported by the API but not yet typed in the SDK.
    // Using a type assertion until the SDK catches up.
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        } as unknown as Anthropic.Messages.Tool,
      ],
      messages: [
        { role: "user", content: userPrompt },
      ],
    });

    const content = this.parseResponse(response);
    const promptTokens = response.usage?.input_tokens ?? 0;

    return { content, promptTokens };
  }

  /**
   * Generate N captions + hooks for a topic.
   * Returns structured CaptionItem[] — not markdown — so the UI can
   * render individual cards with per-card copy buttons.
   *
   * Uses JSON mode via instruction (Anthropic doesn't have a dedicated
   * JSON response_format like OpenAI, so we parse strictly and throw
   * on malformed output — caller should retry once on parse failure).
   */
  async generateCaptions(
    topic: string,
    platform: Platform,
    vibe: CaptionVibe,
    count: number
  ): Promise<{ items: CaptionItem[]; promptTokens: number }> {
    const system = this.getCaptionSystemPrompt(platform, vibe, count);
    const user = this.getCaptionUserPrompt(topic, platform, vibe, count);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });

    const rawText = this.parseResponse(response);
    const items = this.parseCaptionJson(rawText, count);
    const promptTokens = response.usage?.input_tokens ?? 0;

    return { items, promptTokens };
  }

  private getCaptionSystemPrompt(
    platform: Platform,
    vibe: CaptionVibe,
    count: number
  ): string {
    return `You are Wavepilot's caption generator. You write scroll-stopping hooks and full captions for solo creators and small businesses.

Your tone is direct, specific, and actionable — no marketing jargon, no generic platitudes, no emoji spam.

PLATFORM: ${platform}
${PLATFORM_GUIDANCE[platform]}

VIBE: ${vibe}
${VIBE_GUIDANCE[vibe]}

Generate exactly ${count} caption options. Each must have:
- "hook": the first line that stops the scroll. Must be specific to the topic. No "Let me tell you why...", no "POV:", no generic framings.
- "caption": the full caption body (without the hook, without hashtags). Platform-appropriate length.
- "hashtags": array of platform-appropriate hashtags as strings WITHOUT the # symbol. Empty array if platform doesn't use hashtags.

Each of the ${count} options should offer a meaningfully different angle on the topic — don't just reword the same idea.

CRITICAL: Respond with ONLY a valid JSON object in this exact shape, no prose, no code fences, no commentary:
{
  "items": [
    { "hook": "...", "caption": "...", "hashtags": ["...", "..."] }
  ]
}`;
  }

  private getCaptionUserPrompt(
    topic: string,
    platform: Platform,
    vibe: CaptionVibe,
    count: number
  ): string {
    return `Topic: ${topic}
Platform: ${platform}
Vibe: ${vibe}
Count: ${count}

Generate ${count} ${vibe} hook + caption combos for ${platform} about this topic. Respond with JSON only.`;
  }

  /**
   * Parse the JSON response. Claude sometimes wraps JSON in ```json ... ```
   * or adds a preamble — strip that defensively.
   */
  private parseCaptionJson(raw: string, expectedCount: number): CaptionItem[] {
    // Strip common wrappers
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");

    // Find first { and last } — defensive against leading/trailing prose
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("Caption response did not contain JSON");
    }
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new Error(`Caption JSON parse failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("items" in parsed) ||
      !Array.isArray((parsed as { items: unknown }).items)
    ) {
      throw new Error("Caption response missing items array");
    }

    const items = (parsed as { items: unknown[] }).items;

    const validated: CaptionItem[] = items.map((item, idx) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as { hook?: unknown }).hook !== "string" ||
        typeof (item as { caption?: unknown }).caption !== "string" ||
        !Array.isArray((item as { hashtags?: unknown }).hashtags)
      ) {
        throw new Error(`Caption item ${idx} has invalid shape`);
      }
      const hashtags = (item as { hashtags: unknown[] }).hashtags
        .filter((h): h is string => typeof h === "string")
        .map((h) => h.replace(/^#+/, "").trim())
        .filter((h) => h.length > 0);

      return {
        hook: (item as { hook: string }).hook.trim(),
        caption: (item as { caption: string }).caption.trim(),
        hashtags,
      };
    });

    if (validated.length === 0) {
      throw new Error("Caption response contained no valid items");
    }

    // If Claude returned fewer than requested, accept it — better than failing
    // the whole request. Slice if it returned more.
    return validated.slice(0, expectedCount);
  }

  /**
   * Extract clean markdown from the API response.
   * Handles mixed content blocks (text + tool_use + tool_result).
   */
  private parseResponse(response: Anthropic.Message): string {
    const textBlocks: string[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textBlocks.push(block.text);
      }
      // tool_use and tool_result blocks are intermediate steps —
      // the final text block contains the complete plan.
    }

    const combined = textBlocks.join("\n\n");

    if (!combined.trim()) {
      throw new Error("Claude returned an empty response");
    }

    return combined.trim();
  }

  // ------------------------------------------------------------------
  // System prompts — one per output type
  // ------------------------------------------------------------------

  private getSystemPrompt(outputType: OutputType): string {
    const base = `You are Wavepilot, an AI social media growth strategist. You help solo creators and small business owners build content strategies based on what's actually trending right now.

Your tone is friendly, direct, and actionable — like a knowledgeable friend, not a corporate consultant. No jargon. No filler. Every recommendation should be immediately actionable.

Always format your output as clean, well-structured markdown. Use headers, bullet points, and tables where they improve readability.

If the trend data provided seems thin or outdated, use your web_search tool to find current trends in the user's niche. Always prioritize fresh, real-time signals over generic advice.`;

    switch (outputType) {
      case "calendar":
        return `${base}

OUTPUT FORMAT: Weekly Content Calendar
Generate a 7-day posting schedule. For each day include:
- Day of week and suggested post time
- Content topic tied to a specific trend
- Platform-specific format (Reel, Short, TikTok, carousel, thread, etc.)
- A suggested caption hook (first line that stops the scroll)
- 3–5 relevant hashtags

End with a "Quick Tips" section with 2–3 tactical notes.`;

      case "trends":
        return `${base}

OUTPUT FORMAT: Trend Report + Post Ideas
Identify 5–10 trending topics relevant to the user's niche. For each trend:
- Trend name and a one-line description
- Momentum indicator: 🔥 Rising, 📈 Peak, 📉 Declining
- Which platforms it's strongest on
- 2–3 specific post ideas (with angle and format)
- Suggested hooks for each idea

End with "Trends to Watch" — 2–3 emerging signals that haven't peaked yet.`;

      case "strategy":
        return `${base}

OUTPUT FORMAT: Full Growth Strategy (30-Day Roadmap)
Generate a comprehensive growth plan including:

1. **Niche Positioning Summary** — who the user is, what makes them different
2. **Platform Priority** — which platforms to focus on first and why
3. **30-Day Content Theme Roadmap** — weekly themes with rationale
4. **Weekly Content Calendar** — first 7 days fully planned (same format as calendar output)
5. **Trending Hashtag Bank** — 30+ hashtags organized by category
6. **Content Format Mix** — recommended % split (video, static, Stories, etc.)
7. **Engagement Growth Tactics** — 5 specific actions to grow followers

This is the premium output — make it comprehensive and worth paying for.`;
    }
  }

  // ------------------------------------------------------------------
  // User prompt builder
  // ------------------------------------------------------------------

  private getUserPrompt(
    outputType: OutputType,
    profileSummary: string,
    trendSummary: string
  ): string {
    const outputLabel =
      outputType === "calendar"
        ? "Weekly Content Calendar"
        : outputType === "trends"
          ? "Trend Report + Post Ideas"
          : "Full Growth Strategy";

    return `Here's my profile:
${profileSummary}

Here's the trending data I've gathered:
${trendSummary}

Generate a ${outputLabel} for me based on this data. Make every recommendation specific to my niche and platforms — no generic advice.`;
  }

  // ------------------------------------------------------------------
  // Formatters
  // ------------------------------------------------------------------

  private formatProfile(profile: UserProfile): string {
    return `- **Niche:** ${profile.niche}
- **Platforms:** ${profile.platforms.join(", ")}
- **Posting goal:** ${profile.postingGoal}
- **Preferred output:** ${profile.planTypePref}`;
  }

  private formatTrends(trends: TrendItem[]): string {
    if (trends.length === 0) {
      return `No trend data was available from the scrapers. Please use your web_search tool to find the latest trending topics in my niche before generating the plan.`;
    }

    const grouped = new Map<string, TrendItem[]>();
    for (const item of trends) {
      const existing = grouped.get(item.platform) ?? [];
      existing.push(item);
      grouped.set(item.platform, existing);
    }

    const sections: string[] = [];
    for (const [platform, items] of grouped) {
      const lines = items.slice(0, 5).map((item) => {
        const momentum =
          item.momentum === "rising" ? "🔥" : item.momentum === "peak" ? "📈" : "📉";
        return `  - ${momentum} **${item.title}** (engagement: ${item.engagementScore}/100)${
          item.hashtags.length > 0 ? ` — ${item.hashtags.slice(0, 3).join(" ")}` : ""
        }`;
      });
      sections.push(`**${platform}:**\n${lines.join("\n")}`);
    }

    return sections.join("\n\n");
  }
}
