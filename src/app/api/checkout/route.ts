/**
 * POST /api/checkout — Creates a Stripe Checkout session
 *
 * Body: { plan: "creator" | "pro" }
 * Returns: { url: "https://checkout.stripe.com/..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { StripeService } from "@/lib/services/StripeService";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 });
  }

  const { plan } = body;
  if (!plan || !["creator", "pro"].includes(plan)) {
    return NextResponse.json(
      { error: 'Plan must be "creator" or "pro"', code: "INVALID_PLAN" },
      { status: 400 }
    );
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  try {
    const service = new StripeService();
    const url = await service.createCheckoutSession(userId, email, plan as "creator" | "pro");
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Failed to create checkout session", err);
    return NextResponse.json(
      { error: "Failed to create checkout session", code: "CHECKOUT_FAILED" },
      { status: 500 }
    );
  }
}
