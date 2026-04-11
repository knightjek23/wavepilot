/**
 * POST /api/generate — Plan generation endpoint
 *
 * Full pipeline:
 * 1. Authenticate via Clerk
 * 2. Validate input (server-side)
 * 3. Rate limit check (10 req/user/hour)
 * 4. UsageService.checkQuota — 429 if monthly quota exceeded
 * 5. TrendService.getTrends — cache → live APIs → (Claude web_search fallback)
 * 6. Load user profile from Supabase
 * 7. ClaudeService.buildPrompt + generatePlan
 * 8. Save plan to Supabase (plans table)
 * 9. UsageService.logUsage
 * 10. Return plan markdown + metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { TrendService } from "@/lib/services/TrendService";
import { ClaudeService } from "@/lib/services/ClaudeService";
import { UsageService } from "@/lib/services/UsageService";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Platform, OutputType, PostingGoal, UserProfile } from "@/types";

const VALID_PLATFORMS: Platform[] = [
  "tiktok", "instagram", "youtube", "reddit", "twitter", "linkedin", "facebook",
];
const VALID_OUTPUT_TYPES: OutputType[] = ["calendar", "trends", "strategy"];
const VALID_GOALS: PostingGoal[] = ["daily", "3-4x/week", "2-3x/week", "weekly"];

// Lazy-init singletons (avoid cold-start crashes when env vars aren't set)
let trendService: TrendService | null = null;
let claudeService: ClaudeService | null = null;
let usageService: UsageService | null = null;

function getTrendService() {
  if (!trendService) trendService = new TrendService();
  return trendService;
}
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
    niche?: string;
    platforms?: string[];
    postingGoal?: string;
    outputType?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const { niche, platforms, postingGoal, outputType } = body;

  if (!niche || typeof niche !== "string" || niche.trim().length === 0 || niche.length > 100) {
    return NextResponse.json(
      { error: "Niche is required (max 100 chars)", code: "INVALID_NICHE" },
      { status: 400 }
    );
  }

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json(
      { error: "At least one platform is required", code: "INVALID_PLATFORMS" },
      { status: 400 }
    );
  }

  const invalidPlatforms = platforms.filter((p) => !VALID_PLATFORMS.includes(p as Platform));
  if (invalidPlatforms.length > 0) {
    return NextResponse.json(
      { error: `Invalid platforms: ${invalidPlatforms.join(", ")}`, code: "INVALID_PLATFORMS" },
      { status: 400 }
    );
  }

  if (!postingGoal || !VALID_GOALS.includes(postingGoal as PostingGoal)) {
    return NextResponse.json(
      { error: "Invalid posting goal", code: "INVALID_GOAL" },
      { status: 400 }
    );
  }

  if (!outputType || !VALID_OUTPUT_TYPES.includes(outputType as OutputType)) {
    return NextResponse.json(
      { error: "Invalid output type", code: "INVALID_OUTPUT_TYPE" },
      { status: 400 }
    );
  }

  // --- 3. Rate limit ---
  const rateResult = checkRateLimit(userId);
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
  const quota = await usage.checkQuota(userId);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Monthly plan limit reached (${quota.used}/${quota.limit}). Upgrade for more.`,
        code: "QUOTA_EXCEEDED",
        used: quota.used,
        limit: quota.limit,
        plan: quota.plan,
      },
      { status: 429 }
    );
  }

  // --- 5. Fetch trends ---
  const trends = getTrendService();
  const trendResult = await trends.getTrends(
    niche.trim(),
    platforms as Platform[]
  );

  // --- 6. Load user profile ---
  const supabase = getSupabaseAdmin();
  const { data: userData } = await supabase
    .from("users")
    .select("id, email, niche, platforms, posting_goal, plan_type_pref, created_at")
    .eq("id", userId)
    .single();

  const profile: UserProfile = {
    id: userId,
    email: userData?.email ?? "",
    niche: niche.trim(),
    platforms: platforms as Platform[],
    postingGoal: postingGoal as PostingGoal,
    planTypePref: outputType as OutputType,
    createdAt: userData?.created_at ?? new Date().toISOString(),
  };

  // --- 7. Generate plan via Claude ---
  const claude = getClaudeService();
  const { system, user: userPrompt } = claude.buildPrompt(
    profile,
    trendResult.items,
    outputType as OutputType
  );

  let content: string;
  let promptTokens: number;

  try {
    const result = await claude.generatePlan(system, userPrompt);
    content = result.content;
    promptTokens = result.promptTokens;
  } catch (err) {
    console.error("ClaudeService.generatePlan failed", err);
    await usage.logFailedAttempt(userId);
    return NextResponse.json(
      { error: "Plan generation failed. Please try again.", code: "GENERATION_FAILED" },
      { status: 500 }
    );
  }

  // --- 8. Save plan to Supabase ---
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      user_id: userId,
      output_type: outputType,
      niche: niche.trim(),
      platforms,
      content,
      prompt_tokens: promptTokens,
    })
    .select("id, created_at")
    .single();

  if (planError || !plan) {
    console.error("Failed to save plan", planError);
    // Still return the content — the user shouldn't lose their plan
    return NextResponse.json({
      content,
      planId: null,
      outputType,
      promptTokens,
      trendSources: trendResult.platformResults,
      warning: "Plan was generated but could not be saved. Copy it now.",
    });
  }

  // --- 9. Log usage ---
  await usage.logUsage(userId, plan.id);

  // --- 10. Return ---
  return NextResponse.json({
    content,
    planId: plan.id,
    outputType,
    promptTokens,
    createdAt: plan.created_at,
    trendSources: trendResult.platformResults,
    fromCache: trendResult.fromCache,
    quota: {
      used: quota.used + 1,
      limit: quota.limit,
      plan: quota.plan,
    },
  });
}
