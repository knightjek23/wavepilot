/**
 * StripeService — Checkout, webhook handling, customer portal
 *
 * Handles:
 * - Creating Stripe Checkout sessions for plan upgrades
 * - Processing webhooks (checkout.session.completed, invoice.paid, customer.subscription.deleted)
 * - Creating Customer Portal sessions for self-serve plan management
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (server-only)
 */

import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PlanTier } from "@/types";

/**
 * Maps our plan tier names to Stripe Price IDs.
 * Set these in your Stripe Dashboard → Products → Pricing.
 * Store the actual IDs in env vars for flexibility.
 */
const PRICE_IDS: Record<Exclude<PlanTier, "free">, string> = {
  creator: process.env.STRIPE_PRICE_CREATOR ?? "",
  pro: process.env.STRIPE_PRICE_PRO ?? "",
};

export class StripeService {
  private stripe: Stripe;
  private supabase: SupabaseClient;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");

    this.stripe = new Stripe(secretKey, { apiVersion: "2025-03-31.basil" as Stripe.LatestApiVersion });

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sbUrl || !sbKey) throw new Error("Supabase env vars not set");
    this.supabase = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  }

  /**
   * Create a Stripe Checkout session for a plan upgrade.
   * Returns the checkout URL to redirect the user to.
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    plan: "creator" | "pro"
  ): Promise<string> {
    const priceId = PRICE_IDS[plan];
    if (!priceId) throw new Error(`No Stripe Price ID configured for plan: ${plan}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return session.url;
  }

  /**
   * Verify and parse a Stripe webhook event.
   */
  constructEvent(payload: string, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Handle relevant webhook events.
   * Syncs subscription state to Supabase.
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        // Ignore unhandled event types
        break;
    }
  }

  /**
   * Create a Stripe Customer Portal session.
   * Lets users manage their subscription, update payment, or cancel.
   */
  async createPortalSession(stripeCustomerId: string): Promise<string> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/dashboard`,
    });

    return session.url;
  }

  // -- Private webhook handlers --

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as PlanTier | undefined;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!userId || !plan) {
      console.error("Checkout session missing userId or plan metadata", { sessionId: session.id });
      return;
    }

    // Fetch subscription to get period end
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    const { error } = await this.supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          status: "active",
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Failed to upsert subscription on checkout", error);
    } else {
      console.log("Subscription activated", { userId, plan, customerId });
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const { error } = await this.supabase
      .from("subscriptions")
      .update({
        status: "active",
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update subscription on invoice.paid", error);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const status = subscription.status === "active" ? "active"
      : subscription.status === "past_due" ? "past_due"
      : "canceled";

    const { error } = await this.supabase
      .from("subscriptions")
      .update({
        status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update subscription", error);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const { error } = await this.supabase
      .from("subscriptions")
      .update({
        plan: "free",
        status: "canceled",
        stripe_subscription_id: null,
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to cancel subscription", error);
    } else {
      console.log("Subscription canceled, reverted to free", { userId });
    }
  }
}
