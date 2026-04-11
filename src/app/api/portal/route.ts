/**
 * POST /api/portal — Creates a Stripe Customer Portal session
 *
 * Returns: { url: "https://billing.stripe.com/..." }
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { StripeService } from "@/lib/services/StripeService";

export async function POST() {
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

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (!sub?.stripe_customer_id || sub.stripe_customer_id.startsWith("pending_")) {
    return NextResponse.json(
      { error: "No active subscription found. Subscribe first.", code: "NO_SUBSCRIPTION" },
      { status: 400 }
    );
  }

  try {
    const service = new StripeService();
    const portalUrl = await service.createPortalSession(sub.stripe_customer_id);
    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    console.error("Failed to create portal session", err);
    return NextResponse.json(
      { error: "Failed to create portal session", code: "PORTAL_FAILED" },
      { status: 500 }
    );
  }
}
