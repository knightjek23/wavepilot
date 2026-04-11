/**
 * POST /api/admin/invite — Batch invite waitlist users
 * GET  /api/admin/invite — Get waitlist stats
 *
 * Admin-only endpoint. Protected by a shared admin secret.
 * In production, replace with proper admin auth (Clerk org roles, etc.)
 *
 * Sprint 4, Ticket #27
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/admin/invite \
 *     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"count": 50, "cohort": "launch-50"}'
 */

import { NextRequest, NextResponse } from "next/server";
import { InviteService } from "@/lib/services/InviteService";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_SECRET) {
    // If no admin secret configured, block all admin requests
    return false;
  }

  const auth = request.headers.get("authorization");
  if (!auth) return false;

  const token = auth.replace("Bearer ", "").trim();
  return token === ADMIN_SECRET;
}

const inviteService = new InviteService();

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { count?: number; cohort?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const count = Math.min(body.count ?? 50, 500); // Cap at 500 per batch
  const cohort = body.cohort ?? "launch-50";

  if (count < 1) {
    return NextResponse.json({ error: "count must be >= 1" }, { status: 400 });
  }

  const result = await inviteService.batchInvite(count, cohort);

  return NextResponse.json({
    ...result,
    message: `Invited ${result.invited} users (${result.failed} failed)`,
    nextStep: "Send invite emails with the codes above. Each code is single-use.",
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await inviteService.getStats();
  return NextResponse.json(stats);
}
