/**
 * POST /api/captions/generate — Caption/Hook Generator endpoint
 *
 * Full pipeline (mirrors /api/generate):
 * 1. Authenticate via Clerk
 * 2. Validate input (server-side)
 * 3. Rate limit check (20 req/user/hour, scope: caption)
 * 4. UsageService.checkQuota("caption") — 429 if monthly quota exceeded
 * 5. ClaudeService.generateCaptions — returns structured JSON
 * 6. Save caption_set to Supabase
 * 7. UsageService.logCaptionUsage
 * 8. Return items + metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { ClaudeService } from "@/lib/services/ClaudeService";
import { UsageService } from "@/lib/services/UsageService";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Platform, CaptionVibe, CaptionItem } from "@/types";

const VALID_PLATFORMS: Platform[] = [
  "tiktok", "instagram", "youtube", "reddit", "twitter", "linkedin", "facebook",
];
const VALID_VIBES: CaptionVibe[] = ["educational", "funny", "bold", "story", "hype"];
const VALID_COUNTS = new Set([5, 10]);

// Lazy-init singletons
let claudeService: ClaudeService | null = null;
let usageService: UsageService | null = null;

function getClaudeService() {
  if (!claudeService) claudeService = new ClaudeService();
  return claudeService;
}
function getUsageService() {
  if (!usageService) usageService = new UsageService();
  return usageService;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  // --- 1. Auth ---
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // --- 2. Parse + validate input ---
  let body: {
    topic?: string;
    platform?: string;
    vibe?: string;
    count?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const { topic, platform, vibe, count } = body;

  if (
    !topic ||
    typeof topic !== "string" ||
    topic.trim().length < 10 ||
    topic.length > 300
  ) {
    return NextResponse.json(
      { error: "Topic must be 10-300 characters", code: "INVALID_TOPIC" },
      { status: 400 }
    );
  }

  if (!platform || !VALID_PLATFORMS.includes(platform as Platform)) {
    return NextResponse.json(
      { error: "Invalid platform", code: "INVALID_PLATFORM" },
      { status: 400 }
    );
  }

  if (!vibe || !VALID_VIBES.includes(vibe as CaptionVibe)) {
    return NextResponse.json(
      { error: "Invalid vibe", code: "INVALID_VIBE" },
      { status: 400 }
    );
  }

  if (typeof count !== "number" || !VALID_COUNTS.has(count)) {
    return NextResponse.json(
      { error: "Count must be 5 or 10", code: "INVALID_COUNT" },
      { status: 400 }
    );
  }

  // --- 3. Rate limit ---
  const rateResult = checkRateLimit(userId, "caption");
  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Try again later.",
        code: "RATE_LIMITED",
        retryAfter: rateResult.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateResult.retryAfterSeconds),
        },
      }
    );
  }

  // --- 4. Quota check ---
  const usage = getUsageService();
  const quota = await usage.checkQuota(userId, "caption");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Monthly caption limit reached (${quota.used}/${quota.limit}). Upgrade for more.`,
        code: "QUOTA_EXCEEDED",
        used: quota.used,
        limit: quota.limit,
        plan: quota.plan,
      },
      { status: 429 }
    );
  }

  // --- 5. Generate via Claude ---
  const claude = getClaudeService();
  const trimmedTopic = topic.trim();

  let items: CaptionItem[];
  let promptTokens: number;

  try {
    const result = await claude.generateCaptions(
      trimmedTopic,
      platform as Platform,
      vibe as CaptionVibe,
      count
    );
    items = result.items;
    promptTokens = result.promptTokens;
  } catch (err) {
    console.error("ClaudeService.generateCaptions failed", err);
    await usage.logFailedAttempt(userId, "caption");
    const message =
      err instanceof Error && err.message.includes("JSON")
        ? "Caption generation returned malformed output. Please try again."
        : "Caption generation failed. Please try again.";
    return NextResponse.json(
      { error: message, code: "GENERATION_FAILED" },
      { status: 500 }
    );
  }

  // --- 6. Save caption_set to Supabase ---
  const supabase = getSupabaseAdmin();
  const { data: captionSet, error: insertError } = await supabase
    .from("caption_sets")
    .insert({
      user_id: userId,
      topic: trimmedTopic,
      platform,
      vibe,
      count,
      items,
      prompt_tokens: promptTokens,
    })
    .select("id, created_at")
    .single();

  if (insertError || !captionSet) {
    console.error("Failed to save caption_set", insertError);
    // Still return the content — the user shouldn't lose their work
    return NextResponse.json({
      items,
      captionSetId: null,
      topic: trimmedTopic,
      platform,
      vibe,
      count,
      promptTokens,
      warning: "Captions were generated but could not be saved. Copy them now.",
    });
  }

  // --- 7. Log usage ---
  await usage.logCaptionUsage(userId, captionSet.id);

  // --- 8. Return ---
  return NextResponse.json({
    items,
    captionSetId: captionSet.id,
    topic: trimmedTopic,
    platform,
    vibe,
    count,
    promptTokens,
    createdAt: captionSet.created_at,
    quota: {
      used: quota.used + 1,
      limit: quota.limit,
      plan: quota.plan,
    },
  });
}
