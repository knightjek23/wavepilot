/**
 * Wavepilot — End-to-end smoke test (Sprint 2, Ticket #14)
 *
 * Tests the full pipeline: onboarding → all 3 plan types → DB verification.
 *
 * Prerequisites:
 * - App running locally: `npm run dev`
 * - All env vars set in .env.local
 * - Supabase tables migrated
 * - A test user created in Clerk + synced to Supabase
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts
 *
 * Set these env vars before running:
 *   SMOKE_TEST_BASE_URL    (default: http://localhost:3000)
 *   SMOKE_TEST_AUTH_TOKEN   (Clerk session token for a test user)
 *   SMOKE_TEST_USER_ID     (Clerk user ID for DB verification)
 */

import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.SMOKE_TEST_BASE_URL ?? "http://localhost:3000";
const AUTH_TOKEN = process.env.SMOKE_TEST_AUTH_TOKEN;
const USER_ID = process.env.SMOKE_TEST_USER_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ---- Helpers ----

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

async function apiCall(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>
): Promise<{ status: number; data: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, data };
}

// ---- Tests ----

async function testHealth() {
  console.log("\n--- Health Check ---");
  const { status, data } = await apiCall("/api/health", "GET");
  assert(status === 200, `GET /api/health returns 200 (got ${status})`);
  assert(data.status === "ok", `Health status is "ok" (got ${data.status})`);
  assert(typeof data.timestamp === "string", "Timestamp is present");
}

async function testOnboarding() {
  console.log("\n--- Onboarding ---");

  // Missing fields should fail validation
  const { status: badStatus } = await apiCall("/api/onboarding", "POST", {
    niche: "",
    platforms: [],
    postingGoal: "",
    outputType: "",
  });
  assert(badStatus === 400 || badStatus === 401, `Empty onboarding returns 400/401 (got ${badStatus})`);

  // Valid onboarding
  const { status, data } = await apiCall("/api/onboarding", "POST", {
    niche: "Fitness & Health",
    platforms: ["youtube", "tiktok"],
    postingGoal: "3-4x/week",
    outputType: "calendar",
  });

  // 401 is expected if no auth token is set — that's still valid behavior
  if (status === 401) {
    console.log("  ⚠ Skipping onboarding (no auth token set)");
  } else {
    assert(status === 200, `Onboarding succeeds (got ${status})`);
  }
}

async function testGeneratePlan(outputType: string) {
  console.log(`\n--- Generate Plan: ${outputType} ---`);

  const { status, data } = await apiCall("/api/generate", "POST", {
    niche: "Fitness & Health",
    platforms: ["youtube", "tiktok"],
    postingGoal: "3-4x/week",
    outputType,
  });

  if (status === 401) {
    console.log("  ⚠ Skipping (no auth token set)");
    return;
  }

  assert(status === 200, `Generate ${outputType} returns 200 (got ${status})`);

  if (status === 200) {
    assert(typeof data.content === "string" && (data.content as string).length > 100,
      `Plan content is substantial (${(data.content as string).length} chars)`);
    assert(data.outputType === outputType, `Output type matches (${data.outputType})`);
    assert(typeof data.planId === "string", `Plan ID returned (${data.planId})`);
    assert(typeof data.promptTokens === "number", `Token count returned (${data.promptTokens})`);
    assert(typeof data.trendSources === "object", "Trend source metadata returned");
    assert(typeof data.quota === "object", "Quota info returned");
  } else {
    console.log(`  Response: ${JSON.stringify(data).slice(0, 200)}`);
  }
}

async function testValidation() {
  console.log("\n--- Input Validation ---");

  // Missing niche
  const r1 = await apiCall("/api/generate", "POST", {
    niche: "",
    platforms: ["youtube"],
    postingGoal: "daily",
    outputType: "calendar",
  });
  assert(r1.status === 400 || r1.status === 401, `Empty niche rejected (${r1.status})`);

  // Invalid platform
  const r2 = await apiCall("/api/generate", "POST", {
    niche: "Fitness",
    platforms: ["myspace"],
    postingGoal: "daily",
    outputType: "calendar",
  });
  assert(r2.status === 400 || r2.status === 401, `Invalid platform rejected (${r2.status})`);

  // Invalid output type
  const r3 = await apiCall("/api/generate", "POST", {
    niche: "Fitness",
    platforms: ["youtube"],
    postingGoal: "daily",
    outputType: "podcast",
  });
  assert(r3.status === 400 || r3.status === 401, `Invalid output type rejected (${r3.status})`);
}

async function testDbVerification() {
  console.log("\n--- DB Verification ---");

  if (!SUPABASE_URL || !SUPABASE_KEY || !USER_ID) {
    console.log("  ⚠ Skipping DB verification (env vars not set)");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  // Check user exists
  const { data: user } = await supabase
    .from("users")
    .select("id, niche, platforms")
    .eq("id", USER_ID)
    .single();
  assert(!!user, `User ${USER_ID} exists in DB`);

  // Check plans were created
  const { data: plans, count } = await supabase
    .from("plans")
    .select("id, output_type, content", { count: "exact" })
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false })
    .limit(3);

  assert((count ?? 0) >= 1, `At least 1 plan exists for user (found ${count})`);

  if (plans && plans.length > 0) {
    for (const plan of plans) {
      assert(
        typeof plan.content === "string" && plan.content.length > 50,
        `Plan ${plan.id} has content (${plan.content.length} chars, type: ${plan.output_type})`
      );
    }
  }

  // Check usage events
  const { count: usageCount } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", USER_ID);
  assert((usageCount ?? 0) >= 1, `Usage events logged (found ${usageCount})`);

  // Check subscription exists
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", USER_ID)
    .single();
  assert(!!sub, `Subscription row exists (plan: ${sub?.plan}, status: ${sub?.status})`);
}

// ---- Runner ----

async function main() {
  console.log("=== Wavepilot Smoke Test ===");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Auth token: ${AUTH_TOKEN ? "set" : "NOT SET (some tests will be skipped)"}`);
  console.log(`User ID: ${USER_ID ?? "NOT SET"}`);

  await testHealth();
  await testValidation();
  await testOnboarding();

  // Generate all 3 plan types
  await testGeneratePlan("calendar");
  await testGeneratePlan("trends");
  await testGeneratePlan("strategy");

  // Verify DB state
  await testDbVerification();

  // Summary
  console.log("\n=== Results ===");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);

  if (failed > 0) {
    console.error("\n⚠ Some tests failed. Review output above.");
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed.");
  }
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
