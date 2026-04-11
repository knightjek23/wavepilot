/**
 * UsageService — Quota checking + usage logging
 *
 * Reads subscriptions + usage_events to determine if a user
 * can generate another plan this billing period.
 *
 * Plan limits: free = 2/month, creator = 20/month, pro = unlimited.
 * Billing period is the current calendar month (e.g. "2026-04").
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, type PlanTier } from "@/types";

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  plan: PlanTier;
}

export class UsageService {
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (!this.client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) throw new Error("Supabase env vars not set");
      this.client = createClient(url, key, { auth: { persistSession: false } });
    }
    return this.client;
  }

  /**
   * Check if a user can generate another plan.
   * Reads the user's subscription tier, then counts usage events
   * in the current billing period.
   */
  async checkQuota(userId: string): Promise<QuotaResult> {
    const client = this.getClient();
    const billingPeriod = this.getCurrentBillingPeriod();

    // Get subscription tier
    const { data: sub } = await client
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .single();

    const plan: PlanTier = (sub?.status === "active" && sub?.plan) ? sub.plan as PlanTier : "free";
    const limit = PLAN_LIMITS[plan];

    // Pro users have unlimited — skip the count
    if (limit === Infinity) {
      return { allowed: true, used: 0, limit: Infinity, plan };
    }

    // Count usage events this billing period
    const { count, error } = await client
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("billing_period", billingPeriod);

    if (error) {
      console.error("UsageService.checkQuota: count query failed", error);
      // Fail open — don't block the user if we can't count
      return { allowed: true, used: 0, limit, plan };
    }

    const used = count ?? 0;

    return {
      allowed: used < limit,
      used,
      limit,
      plan,
    };
  }

  /**
   * Log a usage event after a plan is generated.
   */
  async logUsage(userId: string, planId: string): Promise<void> {
    const client = this.getClient();
    const billingPeriod = this.getCurrentBillingPeriod();

    const { error } = await client.from("usage_events").insert({
      user_id: userId,
      plan_id: planId,
      billing_period: billingPeriod,
    });

    if (error) {
      console.error("UsageService.logUsage failed", error);
      // Non-fatal — the plan was already generated and saved
    }
  }

  /**
   * Log a failed generation attempt (no plan_id).
   * Doesn't count toward quota — just for observability.
   */
  async logFailedAttempt(userId: string): Promise<void> {
    const client = this.getClient();

    const { error } = await client.from("usage_events").insert({
      user_id: userId,
      plan_id: null,
      billing_period: this.getCurrentBillingPeriod(),
    });

    if (error) {
      console.error("UsageService.logFailedAttempt failed", error);
    }
  }

  /**
   * Current billing period as "YYYY-MM" string.
   * All timestamps in UTC per dev principles.
   */
  private getCurrentBillingPeriod(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
}
