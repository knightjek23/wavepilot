/**
 * POST /api/webhooks/stripe — Stripe webhook endpoint
 *
 * Verifies webhook signature, then delegates to StripeService.handleWebhook.
 *
 * Stripe Dashboard → Webhooks → Add Endpoint:
 *   URL: https://wavepilot.co/api/webhooks/stripe
 *   Events: checkout.session.completed, invoice.paid,
 *           customer.subscription.updated, customer.subscription.deleted
 */

import { NextRequest, NextResponse } from "next/server";
import { StripeService } from "@/lib/services/StripeService";

// Lazy-init to avoid crashing when env vars aren't set
let stripeService: StripeService | null = null;
function getStripeService() {
  if (!stripeService) stripeService = new StripeService();
  return stripeService;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header", code: "INVALID_WEBHOOK" },
      { status: 400 }
    );
  }

  const body = await request.text();
  let service: StripeService;

  try {
    service = getStripeService();
  } catch {
    console.error("StripeService not configured");
    return NextResponse.json(
      { error: "Webhook not configured", code: "NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  let event;
  try {
    event = service.constructEvent(body, signature);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json(
      { error: "Invalid signature", code: "INVALID_SIGNATURE" },
      { status: 401 }
    );
  }

  try {
    await service.handleWebhook(event);
  } catch (err) {
    console.error("Stripe webhook handler failed", err);
    return NextResponse.json(
      { error: "Webhook processing failed", code: "HANDLER_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
