/**
 * InviteService — Manages waitlist → invite → signup flow
 *
 * Handles:
 * - Generating unique invite codes
 * - Batch inviting waitlist entries (FIFO)
 * - Validating invite codes at signup
 * - Granting 30-day Creator trial for invited users
 *
 * Sprint 4, Ticket #27
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export interface InviteResult {
  invited: number;
  failed: number;
  codes: Array<{ email: string; code: string }>;
}

export interface InviteValidation {
  valid: boolean;
  email?: string;
  error?: string;
}

export class InviteService {
  private supabase: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) throw new Error("Supabase credentials not configured");
      this.supabase = createClient(url, key, { auth: { persistSession: false } });
    }
    return this.supabase;
  }

  /**
   * Generate a unique invite code.
   * Format: wp_inv_XXXXXXXX (16 random hex chars for 64 bits of entropy)
   */
  private generateCode(): string {
    return `wp_inv_${randomBytes(8).toString("hex")}`;
  }

  /**
   * Batch invite the next N waitlist entries (FIFO order).
   * Updates their status to 'invited', sets invite_code and invited_at.
   */
  async batchInvite(count: number, cohort: string = "launch-50"): Promise<InviteResult> {
    const db = this.getClient();

    // Grab the oldest 'waiting' entries
    const { data: entries, error: fetchError } = await db
      .from("waitlist")
      .select("id, email")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(count);

    if (fetchError || !entries || entries.length === 0) {
      return { invited: 0, failed: 0, codes: [] };
    }

    let invited = 0;
    let failedCount = 0;
    const codes: Array<{ email: string; code: string }> = [];

    for (const entry of entries) {
      const code = this.generateCode();

      const { error: updateError } = await db
        .from("waitlist")
        .update({
          status: "invited",
          invite_code: code,
          invited_at: new Date().toISOString(),
        })
        .eq("id", entry.id)
        .eq("status", "waiting"); // Optimistic lock — only update if still waiting

      if (updateError) {
        console.error(`[invite] Failed to invite ${entry.email}:`, updateError.message);
        failedCount++;
      } else {
        invited++;
        codes.push({ email: entry.email, code });
      }
    }

    return { invited, failed: failedCount, codes };
  }

  /**
   * Validate an invite code. Returns the associated email if valid.
   */
  async validateCode(code: string): Promise<InviteValidation> {
    if (!code || !code.startsWith("wp_inv_")) {
      return { valid: false, error: "Invalid invite code format" };
    }

    const db = this.getClient();

    const { data, error } = await db
      .from("waitlist")
      .select("email, status")
      .eq("invite_code", code)
      .single();

    if (error || !data) {
      return { valid: false, error: "Invite code not found" };
    }

    if (data.status === "signed_up") {
      return { valid: false, error: "This invite has already been used" };
    }

    if (data.status !== "invited") {
      return { valid: false, error: "This invite is no longer valid" };
    }

    return { valid: true, email: data.email };
  }

  /**
   * Redeem an invite code — mark as signed_up and grant 30-day Creator trial.
   * Called after the user completes Clerk signup.
   */
  async redeemInvite(
    code: string,
    userId: string,
    cohort: string = "launch-50"
  ): Promise<{ success: boolean; error?: string }> {
    const validation = await this.validateCode(code);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const db = this.getClient();

    // Mark waitlist entry as signed up
    const { error: wlError } = await db
      .from("waitlist")
      .update({
        status: "signed_up",
        signed_up_at: new Date().toISOString(),
      })
      .eq("invite_code", code);

    if (wlError) {
      console.error("[invite] Failed to mark waitlist entry:", wlError.message);
      return { success: false, error: "Failed to redeem invite" };
    }

    // Grant 30-day Creator trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const { error: subError } = await db
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: "creator",
          status: "active",
          trial_ends_at: trialEnd.toISOString(),
          invite_code: code,
          cohort,
          // These will be null for trial users (no Stripe subscription)
          stripe_customer_id: null,
          stripe_subscription_id: null,
          current_period_end: trialEnd.toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (subError) {
      console.error("[invite] Failed to create trial subscription:", subError.message);
      return { success: false, error: "Failed to activate trial" };
    }

    return { success: true };
  }

  /**
   * Get waitlist stats for admin dashboard.
   */
  async getStats(): Promise<{
    total: number;
    waiting: number;
    invited: number;
    signedUp: number;
  }> {
    const db = this.getClient();

    const [total, waiting, invited, signedUp] = await Promise.all([
      db.from("waitlist").select("id", { count: "exact", head: true }),
      db.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "waiting"),
      db.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "invited"),
      db.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "signed_up"),
    ]);

    return {
      total: total.count ?? 0,
      waiting: waiting.count ?? 0,
      invited: invited.count ?? 0,
      signedUp: signedUp.count ?? 0,
    };
  }
}
