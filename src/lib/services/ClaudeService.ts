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
import type { OutputType, TrendItem, UserProfile } from "@/types";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

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
