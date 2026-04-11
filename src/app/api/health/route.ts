/**
 * GET /api/health — Enhanced health check with dependency monitoring
 *
 * Returns overall status + individual service checks.
 * Pings BetterUptime heartbeat when healthy (uptime monitoring).
 *
 * Sprint 4, Ticket #23
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const APP_VERSION = process.env.npm_package_version ?? "0.1.0";

interface ServiceCheck {
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  error?: string;
}

interface HealthResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    supabase: ServiceCheck;
    clerk: ServiceCheck;
    anthropic: ServiceCheck;
  };
}

const startTime = Date.now();

async function checkSupabase(): Promise<ServiceCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return { status: "down", latencyMs: 0, error: "Missing credentials" };
  }

  const start = Date.now();
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    // Lightweight query — count users table (tiny payload)
    const { error } = await supabase.from("users").select("id", { count: "exact", head: true });
    const latencyMs = Date.now() - start;

    if (error) {
      return { status: "degraded", latencyMs, error: error.message };
    }
    return { status: "ok", latencyMs };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkClerk(): Promise<ServiceCheck> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key || key.startsWith("sk_test_placeholder")) {
    return { status: "degraded", latencyMs: 0, error: "Not configured" };
  }

  const start = Date.now();
  try {
    // Lightweight call to Clerk's API — just check connectivity
    const res = await fetch("https://api.clerk.com/v1/clients", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;

    if (res.ok || res.status === 401) {
      // 401 means key format is valid but may be test key — still "reachable"
      return { status: "ok", latencyMs };
    }
    return { status: "degraded", latencyMs, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Timeout",
    };
  }
}

async function checkAnthropic(): Promise<ServiceCheck> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "sk-ant-...") {
    return { status: "degraded", latencyMs: 0, error: "Not configured" };
  }

  const start = Date.now();
  try {
    // Hit the models endpoint — lightweight, no token cost
    const res = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return { status: "ok", latencyMs };
    }
    return { status: "degraded", latencyMs, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Timeout",
    };
  }
}

async function pingHeartbeat() {
  const heartbeatUrl = process.env.BETTERUPTIME_HEARTBEAT_URL;
  if (!heartbeatUrl) return;

  try {
    await fetch(heartbeatUrl, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Heartbeat failure is non-critical — don't affect health response
  }
}

export async function GET() {
  // Run all checks in parallel
  const [supabase, clerk, anthropic] = await Promise.all([
    checkSupabase(),
    checkClerk(),
    checkAnthropic(),
  ]);

  // Overall status: "down" if any critical service is down, "degraded" if any is degraded
  const services = { supabase, clerk, anthropic };
  const statuses = Object.values(services).map((s) => s.status);

  let overallStatus: "ok" | "degraded" | "down" = "ok";
  if (statuses.includes("down")) {
    // Supabase down = critical. Others degraded = still operational.
    overallStatus = supabase.status === "down" ? "down" : "degraded";
  } else if (statuses.includes("degraded")) {
    overallStatus = "degraded";
  }

  const health: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services,
  };

  // Ping uptime heartbeat when healthy
  if (overallStatus === "ok") {
    pingHeartbeat(); // fire-and-forget
  }

  const httpStatus = overallStatus === "down" ? 503 : 200;
  return NextResponse.json(health, { status: httpStatus });
}
