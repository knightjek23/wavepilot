/**
 * POST /api/invite/redeem — Redeem an invite code after signup
 *
 * Called after the user completes Clerk signup with a valid invite code.
 * Grants 30-day Creator trial.
 *
 * Sprint 4, Ticket #27
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { InviteService } from "@/lib/services/InviteService";

const inviteService = new InviteService();

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string; cohort?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const result = await inviteService.redeemInvite(code, userId, body.cohort ?? "launch-50");

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to redeem invite" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Welcome to Wavepilot! You have 30 days of Creator tier — free.",
    trial: {
      plan: "creator",
      durationDays: 30,
    },
  });
}
