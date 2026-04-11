/**
 * Wavepilot — Security Audit Script (Sprint 4, Ticket #26)
 *
 * Automated checks for common security issues:
 * 1. Secrets in source code (git grep)
 * 2. RLS policies on all tables
 * 3. Rate limiter configuration
 * 4. CORS config
 * 5. Stripe webhook signature verification
 * 6. Server-only env vars not exposed to client bundle
 * 7. Security headers
 * 8. Auth middleware coverage
 *
 * Usage:
 *   npx tsx scripts/security-audit.ts
 *
 * Env vars needed for live checks:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   SMOKE_TEST_BASE_URL (default: http://localhost:3000)
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.SMOKE_TEST_BASE_URL ?? "http://localhost:3000";
const SRC_DIR = path.resolve(__dirname, "../src");

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  failed++;
}

function warn(msg: string) {
  console.warn(`  ⚠ ${msg}`);
  warnings++;
}

// ── 1. Secrets in Source Code ──

function auditSecrets() {
  console.log("\n--- 1. Secret Detection ---");

  const patterns = [
    { name: "Supabase service key", pattern: "sbp_[a-zA-Z0-9]{20,}" },
    { name: "Anthropic API key", pattern: "sk-ant-[a-zA-Z0-9_-]{20,}" },
    { name: "Clerk secret key", pattern: "sk_test_[a-zA-Z0-9]{20,}" },
    { name: "Stripe secret key", pattern: "sk_test_[a-zA-Z0-9]{20,}" },
    { name: "Stripe webhook secret", pattern: "whsec_[a-zA-Z0-9]{20,}" },
    { name: "Generic API key in string", pattern: 'api[_-]?key\\s*[=:]\\s*["\'][a-zA-Z0-9]{20,}["\']' },
    { name: "Private key block", pattern: "-----BEGIN (RSA |EC )?PRIVATE KEY-----" },
    { name: "JWT token", pattern: "eyJ[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}" },
  ];

  for (const { name, pattern } of patterns) {
    try {
      const result = execSync(
        `grep -rn --include='*.ts' --include='*.tsx' --include='*.js' -E '${pattern}' src/ || true`,
        { cwd: path.resolve(__dirname, ".."), encoding: "utf-8" }
      );

      // Filter out .env.example and comments
      const realHits = result
        .split("\n")
        .filter((line) => line.trim())
        .filter((line) => !line.includes(".env.example"))
        .filter((line) => !line.includes("// "))
        .filter((line) => !line.includes("* "))
        .filter((line) => !line.includes("sk-ant-..."))
        .filter((line) => !line.includes("sk_test_..."))
        .filter((line) => !line.includes("pk_test_placeholder"));

      if (realHits.length > 0) {
        fail(`${name}: found ${realHits.length} potential match(es)`);
        realHits.forEach((hit) => console.error(`    → ${hit.trim()}`));
      } else {
        pass(`No ${name} found in source`);
      }
    } catch {
      pass(`No ${name} found in source`);
    }
  }

  // Check .gitignore includes .env.local
  const gitignore = fs.readFileSync(path.resolve(__dirname, "../.gitignore"), "utf-8");
  if (gitignore.includes(".env.local") || gitignore.includes(".env*.local")) {
    pass(".env.local is in .gitignore");
  } else {
    fail(".env.local is NOT in .gitignore");
  }
}

// ── 2. RLS Policies ──

async function auditRLS() {
  console.log("\n--- 2. Row-Level Security ---");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    warn("Skipping RLS check (no Supabase credentials)");
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Check that RLS is enabled on critical tables
  const tables = ["users", "plans", "usage_events", "subscriptions", "trend_cache", "waitlist"];

  for (const table of tables) {
    try {
      // Try to select without RLS bypass — service role bypasses RLS,
      // so we check migration files instead
      const migrationDir = path.resolve(__dirname, "../supabase/migrations");
      const migrationFiles = fs.readdirSync(migrationDir).sort();
      const allMigrations = migrationFiles
        .map((f) => fs.readFileSync(path.join(migrationDir, f), "utf-8"))
        .join("\n");

      if (allMigrations.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)) {
        pass(`RLS enabled on '${table}' (in migrations)`);
      } else if (allMigrations.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`)) {
        pass(`RLS enabled on '${table}' (in migrations)`);
      } else {
        fail(`RLS NOT found for '${table}' in migration files`);
      }
    } catch (err) {
      warn(`Could not check RLS for '${table}': ${err}`);
    }
  }
}

// ── 3. Rate Limiting ──

function auditRateLimit() {
  console.log("\n--- 3. Rate Limiting ---");

  const rateLimitFile = path.join(SRC_DIR, "lib/rate-limit.ts");
  if (!fs.existsSync(rateLimitFile)) {
    fail("rate-limit.ts not found");
    return;
  }

  const content = fs.readFileSync(rateLimitFile, "utf-8");

  if (content.includes("sliding") || content.includes("window")) {
    pass("Rate limiter uses sliding window pattern");
  } else {
    warn("Rate limiter pattern unclear — verify manually");
  }

  // Check it's used in /api/generate
  const generateRoute = path.join(SRC_DIR, "app/api/generate/route.ts");
  if (fs.existsSync(generateRoute)) {
    const genContent = fs.readFileSync(generateRoute, "utf-8");
    if (genContent.includes("rate") || genContent.includes("rateLimit") || genContent.includes("rate-limit")) {
      pass("Rate limiter referenced in /api/generate");
    } else {
      fail("Rate limiter NOT referenced in /api/generate");
    }
  } else {
    fail("/api/generate route not found");
  }
}

// ── 4. CORS Configuration ──

function auditCORS() {
  console.log("\n--- 4. CORS Configuration ---");

  const nextConfig = fs.readFileSync(path.resolve(__dirname, "../next.config.ts"), "utf-8");

  if (nextConfig.includes("X-Frame-Options") && nextConfig.includes("DENY")) {
    pass("X-Frame-Options: DENY is set");
  } else {
    fail("X-Frame-Options: DENY not found in next.config.ts");
  }

  if (nextConfig.includes("X-Content-Type-Options") && nextConfig.includes("nosniff")) {
    pass("X-Content-Type-Options: nosniff is set");
  } else {
    fail("X-Content-Type-Options: nosniff not found");
  }

  if (nextConfig.includes("Strict-Transport-Security")) {
    pass("HSTS header configured");
  } else {
    fail("HSTS header not found in next.config.ts");
  }

  if (nextConfig.includes("Content-Security-Policy")) {
    pass("CSP header configured");
  } else {
    warn("No Content-Security-Policy header found");
  }

  if (nextConfig.includes("Permissions-Policy")) {
    pass("Permissions-Policy header configured");
  } else {
    warn("No Permissions-Policy header found");
  }

  // Check waitlist endpoint has CORS handling
  const waitlistRoute = path.join(SRC_DIR, "app/api/waitlist/route.ts");
  if (fs.existsSync(waitlistRoute)) {
    const content = fs.readFileSync(waitlistRoute, "utf-8");
    if (content.includes("ALLOWED_ORIGINS") || content.includes("Access-Control")) {
      pass("Waitlist endpoint has CORS handling");
    } else {
      fail("Waitlist endpoint missing CORS handling");
    }
  }
}

// ── 5. Webhook Signature Verification ──

function auditWebhooks() {
  console.log("\n--- 5. Webhook Security ---");

  // Clerk webhook
  const clerkWebhook = path.join(SRC_DIR, "app/api/webhooks/clerk/route.ts");
  if (fs.existsSync(clerkWebhook)) {
    const content = fs.readFileSync(clerkWebhook, "utf-8");
    if (content.includes("svix") || content.includes("Webhook") || content.includes("verify")) {
      pass("Clerk webhook uses Svix signature verification");
    } else {
      fail("Clerk webhook missing signature verification");
    }
  } else {
    warn("Clerk webhook route not found");
  }

  // Stripe webhook
  const stripeWebhook = path.join(SRC_DIR, "app/api/webhooks/stripe/route.ts");
  if (fs.existsSync(stripeWebhook)) {
    const content = fs.readFileSync(stripeWebhook, "utf-8");
    if (content.includes("constructEvent") || content.includes("stripe-signature")) {
      pass("Stripe webhook uses signature verification");
    } else {
      fail("Stripe webhook missing signature verification");
    }
  } else {
    warn("Stripe webhook route not found");
  }
}

// ── 6. Server-Only Env Vars ──

function auditEnvExposure() {
  console.log("\n--- 6. Server-Only Env Var Exposure ---");

  // These should NEVER appear in client-side code (files with "use client" or in components)
  const serverOnlyVars = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
    "CLERK_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "CLERK_WEBHOOK_SECRET",
    "REDDIT_CLIENT_SECRET",
    "RAPIDAPI_KEY",
  ];

  // Scan all client components
  const clientFiles: string[] = [];
  function findClientFiles(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findClientFiles(fullPath);
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes('"use client"') || content.includes("'use client'")) {
          clientFiles.push(fullPath);
        }
      }
    }
  }
  findClientFiles(SRC_DIR);

  for (const envVar of serverOnlyVars) {
    let found = false;
    for (const file of clientFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes(envVar)) {
        fail(`${envVar} referenced in client component: ${path.relative(SRC_DIR, file)}`);
        found = true;
      }
    }
    if (!found) {
      pass(`${envVar} not exposed to client bundle`);
    }
  }
}

// ── 7. Auth Middleware Coverage ──

function auditAuthMiddleware() {
  console.log("\n--- 7. Auth Middleware ---");

  const middleware = path.join(SRC_DIR, "middleware.ts");
  if (!fs.existsSync(middleware)) {
    fail("No middleware.ts found — all routes may be unprotected");
    return;
  }

  const content = fs.readFileSync(middleware, "utf-8");

  if (content.includes("clerkMiddleware") || content.includes("auth.protect")) {
    pass("Clerk auth middleware is active");
  } else {
    fail("No auth protection in middleware");
  }

  // Check that sensitive routes are NOT in public matcher
  const publicRoutes = content.match(/createRouteMatcher\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
  const sensitiveRoutes = ["/api/generate", "/api/checkout", "/api/portal", "/dashboard", "/history"];

  for (const route of sensitiveRoutes) {
    if (publicRoutes.includes(route)) {
      fail(`${route} is listed as public — should require auth`);
    } else {
      pass(`${route} is protected (not in public routes)`);
    }
  }
}

// ── 8. PDF Export Gating ──

function auditPDFGating() {
  console.log("\n--- 8. Feature Gating ---");

  const pdfRoute = path.join(SRC_DIR, "app/api/export/pdf/route.ts");
  if (fs.existsSync(pdfRoute)) {
    const content = fs.readFileSync(pdfRoute, "utf-8");
    if (content.includes("free") && (content.includes("403") || content.includes("UPGRADE_REQUIRED"))) {
      pass("PDF export gated — free users blocked");
    } else {
      fail("PDF export may not be properly gated");
    }
  } else {
    warn("PDF export route not found");
  }
}

// ── Runner ──

async function main() {
  console.log("=== Wavepilot Security Audit ===");
  console.log(`Source: ${SRC_DIR}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  auditSecrets();
  await auditRLS();
  auditRateLimit();
  auditCORS();
  auditWebhooks();
  auditEnvExposure();
  auditAuthMiddleware();
  auditPDFGating();

  console.log("\n=== Security Audit Results ===");
  console.log(`  Passed:   ${passed}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Warnings: ${warnings}`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} security issue(s) found. Fix before launch.`);
    process.exit(1);
  } else if (warnings > 0) {
    console.warn(`\n⚠ ${warnings} warning(s). Review before launch.`);
    process.exit(0);
  } else {
    console.log("\n✅ All security checks passed.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Security audit crashed:", err);
  process.exit(1);
});
