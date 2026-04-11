/**
 * GET /api/plans — Returns the authenticated user's saved plans.
 * Ordered by created_at DESC. Max 50 results.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server configuration error", code: "CONFIG_ERROR" }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("plans")
    .select("id, output_type, niche, platforms, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch plans", error);
    return NextResponse.json({ error: "Failed to load plans", code: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ plans: data ?? [] });
}
