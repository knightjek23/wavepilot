/**
 * UsageService — Quota checking + usage logging
 *
 * Reads subscriptions + usage_events to determine if a user
 * can generate another plan (or caption set) this billing period.
 *
 * Plan limits:    free = 2,   creator = 20,  pro = unlimited  per month
 * Caption limits: free = 5,   creator = 100, pro = unlimited  per month
 *
 * Billing period is the current calendar month (e.g. "2026-04").
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, CAPTION_LIMITS, type PlanTier, type UsageEventType } from "@/types";

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
   * Check if a user can generate another event of the given type.
   *
   * @param userId    Clerk user id
   * @param eventType "plan" (default) | "caption"
   */
  async checkQuota(
    userId: string,
    eventType: UsageEventType = "plan"
  ): Promise<QuotaResult> {
    const client = this.getClient();
    const billingPeriod = this.getCurrentBillingPeriod();

    // Get subscription tier
    const { data: sub } = await client
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .single();

    const plan: PlanTier =
      sub?.status === "active" && sub?.plan ? (sub.plan as PlanTier) : "free";

    const limit = this.getLimitForType(plan, eventType);

    // Pro users (or any tier with Infinity) have unlimited — skip the count
    if (limit === Infinity) {
      return { allowed: true, used: 0, limit: Infinity, plan };
    }

    // Count usage events of this type in the current billing period.
    // Only successful events count against quota — failures shouldn't
    // burn someone's free tier on a 500 from Claude.
    const { count, error } = await client
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("billing_period", billingPeriod)
      .eq("event_type", eventType)
      .eq("success", true);

    if (error) {
      console.error(
        `UsageService.checkQuota(${eventType}): count query failed`,
        error
      );
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
   * Log a successful plan generation (legacy signature preserved).
   */
  async logUsage(userId: string, planId: string): Promise<void> {
    return this.logEvent(userId, "plan", { planId });
  }

  /**
   * Log a successful caption generation.
   */
  async logCaptionUsage(userId: string, captionSetId: string): Promise<void> {
    return this.logEvent(userId, "caption", { captionSetId });
  }

  /**
   * Log a failed generation attempt.
   * Doesn't count toward quota — just for observability.
   *
   * @param userId
   * @param eventType defaults to "plan" for back-compat
   */
  async logFailedAttempt(
    userId: string,
    eventType: UsageEventType = "plan"
  ): Promise<void> {
    const client = this.getClient();

    const { error } = await client.from("usage_events").insert({
      user_id: userId,
      plan_id: null,
      caption_set_id: null,
      event_type: eventType,
      billing_period: this.getCurrentBillingPeriod(),
      success: false, // failures are logged for observability but don't burn quota
    });

    if (error) {
      console.error(`UsageService.logFailedAttempt(${eventType}) failed`, error);
    }
  }

  // -----------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------

  private async logEvent(
    userId: string,
    eventType: UsageEventType,
    refs: { planId?: string; captionSetId?: string }
  ): Promise<void> {
    const client = this.getClient();
    const billingPeriod = this.getCurrentBillingPeriod();

    const { error } = await client.from("usage_events").insert({
      user_id: userId,
      plan_id: refs.planId ?? null,
      caption_set_id: refs.captionSetId ?? null,
      event_type: eventType,
      billing_period: billingPeriod,
    });

    if (error) {
      console.error(`UsageService.logEvent(${eventType}) failed`, error);
      // Non-fatal — the work was already done and returned to the user
    }
  }

  private getLimitForType(plan: PlanTier, eventType: UsageEventType): number {
    return eventType === "caption" ? CAPTION_LIMITS[plan] : PLAN_LIMITS[plan];
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
