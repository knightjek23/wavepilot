/**
 * POST /api/invite/validate — Validate an invite code
 * POST /api/invite/redeem  — (below) Redeem an invite code after signup
 *
 * Public endpoint — called during the signup flow.
 * Sprint 4, Ticket #27
 */

import { NextRequest, NextResponse } from "next/server";
import { InviteService } from "@/lib/services/InviteService";

const inviteService = new InviteService();

export async function POST(request: NextRequest) {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const result = await inviteService.validateCode(code);

  if (!result.valid) {
    return NextResponse.json(
      { valid: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    valid: true,
    // Don't expose full email — just hint
    emailHint: result.email
      ? `${result.email.slice(0, 2)}***@${result.email.split("@")[1]}`
      : undefined,
  });
}
