/**
 * GET /api/captions/list — List the current user's caption sets
 *
 * Returns the 50 most recent caption_sets for this user.
 * Uses service role so RLS doesn't fight us — we filter by userId explicitly.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("caption_sets")
    .select("id, topic, platform, vibe, count, items, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("caption_sets list failed", error);
    return NextResponse.json(
      { error: "Failed to load caption history", code: "LIST_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ captionSets: data ?? [] });
}
