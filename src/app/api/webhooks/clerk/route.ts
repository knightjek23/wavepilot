/**
 * Clerk webhook — syncs user creation to Supabase users table.
 *
 * When a new user signs up via Clerk, this webhook:
 * 1. Verifies the webhook signature (via Svix)
 * 2. Inserts a row into the users table with the Clerk user_id as PK
 * 3. Creates a free-tier subscription row
 *
 * Clerk Dashboard → Webhooks → Add Endpoint:
 *   URL: https://wavepilot.co/api/webhooks/clerk
 *   Events: user.created
 */

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

// Supabase admin client import is deferred until env vars are available
// import { supabaseAdmin } from "@/lib/supabase/server";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    created_at: number;
  };
  type: string;
}

export async function POST(request: NextRequest) {
  if (!CLERK_WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook not configured", code: "WEBHOOK_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  // Verify webhook signature
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers", code: "INVALID_WEBHOOK" },
      { status: 400 }
    );
  }

  const body = await request.text();
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    console.error("Clerk webhook signature verification failed");
    return NextResponse.json(
      { error: "Invalid signature", code: "INVALID_SIGNATURE" },
      { status: 401 }
    );
  }

  // Handle user.created event
  if (event.type === "user.created") {
    const { id, email_addresses } = event.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      console.error("Clerk user.created event missing email", { userId: id });
      return NextResponse.json(
        { error: "Missing email", code: "MISSING_EMAIL" },
        { status: 400 }
      );
    }

    // Dynamic import to avoid crashing when env vars aren't set during build
    const { supabaseAdmin } = await import("@/lib/supabase/server");

    // Insert user row
    const { error: userError } = await supabaseAdmin
      .from("users")
      .insert({ id, email })
      .single();

    if (userError && userError.code !== "23505") {
      // 23505 = unique violation (user already exists, idempotent)
      console.error("Failed to insert user", userError);
      return NextResponse.json(
        { error: "Database error", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Create free-tier subscription placeholder
    // Stripe customer ID will be set when they first hit checkout
    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: id,
        stripe_customer_id: `pending_${id}`,
        plan: "free",
        status: "active",
      })
      .single();

    if (subError && subError.code !== "23505") {
      console.error("Failed to insert subscription", subError);
      // Non-fatal — user was created, subscription can be retried
    }

    console.log("Synced new Clerk user to Supabase", { userId: id, email });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
