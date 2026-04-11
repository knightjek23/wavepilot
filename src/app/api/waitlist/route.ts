/**
 * POST /api/waitlist — Landing page waitlist signup
 *
 * Public endpoint (no auth required). Accepts email + optional metadata.
 * Stores in Supabase waitlist table.
 *
 * Sprint 4, Ticket #25
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Email validation regex — covers 99.9% of real addresses
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  // CORS check
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");
  if (!allowedOrigins.some((o) => origin.startsWith(o.trim()))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; name?: string; niche?: string; referral?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Valid email is required", code: "INVALID_EMAIL" },
      { status: 400 }
    );
  }

  // Block disposable email domains (basic list — expand as needed)
  const disposable = ["mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email", "yopmail.com"];
  const domain = email.split("@")[1];
  if (disposable.includes(domain)) {
    return NextResponse.json(
      { error: "Please use a permanent email address", code: "DISPOSABLE_EMAIL" },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Upsert — if they already signed up, just return success (don't reveal existence)
  const { error } = await supabase.from("waitlist").upsert(
    {
      email,
      name: body.name?.trim().slice(0, 100) || null,
      niche: body.niche?.trim().slice(0, 100) || null,
      referral: body.referral?.trim().slice(0, 200) || null,
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("[waitlist] Insert error:", error.message);
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }

  // Get current position (approximate — count of entries before this one)
  const { count } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting");

  return NextResponse.json(
    {
      success: true,
      message: "You're on the list!",
      position: count ?? 0,
    },
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
      },
    }
  );
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
