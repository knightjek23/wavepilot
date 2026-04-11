/**
 * POST /api/onboarding — Saves user profile after onboarding flow
 *
 * Requires authenticated Clerk session.
 * Updates the users table with niche, platforms, posting_goal, plan_type_pref.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { Platform, PostingGoal, OutputType } from "@/types";

const VALID_PLATFORMS: Platform[] = [
  "tiktok", "instagram", "youtube", "reddit", "twitter", "linkedin", "facebook",
];
const VALID_GOALS: PostingGoal[] = ["daily", "3-4x/week", "2-3x/week", "weekly"];
const VALID_OUTPUT_TYPES: OutputType[] = ["calendar", "trends", "strategy"];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

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

  // --- Server-side validation ---
  const { niche, platforms, postingGoal, outputType } = body;

  if (!niche || typeof niche !== "string" || niche.trim().length === 0 || niche.length > 100) {
    return NextResponse.json(
      { error: "Niche is required (max 100 characters)", code: "INVALID_NICHE" },
      { status: 400 }
    );
  }

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json(
      { error: "At least one platform is required", code: "INVALID_PLATFORMS" },
      { status: 400 }
    );
  }

  const invalidPlatforms = platforms.filter(
    (p) => !VALID_PLATFORMS.includes(p as Platform)
  );
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

  // --- Save to Supabase ---
  const { supabaseAdmin } = await import("@/lib/supabase/server");

  const { error: dbError } = await supabaseAdmin
    .from("users")
    .update({
      niche: niche.trim(),
      platforms,
      posting_goal: postingGoal,
      plan_type_pref: outputType,
    })
    .eq("id", userId);

  if (dbError) {
    console.error("Failed to update user profile", dbError);
    return NextResponse.json(
      { error: "Failed to save profile", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
