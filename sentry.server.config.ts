/**
 * Sentry server-side configuration — Sprint 4, Ticket #22
 *
 * Loaded automatically by @sentry/nextjs for Node.js server runtime.
 * Safe to skip when SENTRY_DSN is not set (dev / CI).
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
    release: `wavepilot@${process.env.npm_package_version ?? "0.1.0"}`,

    // Performance — lower rate server-side (higher volume)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Spotlight for local dev (Sentry's dev overlay)
    spotlight: process.env.NODE_ENV === "development",

    // Custom alert rules — tag /api/generate errors for priority alerting
    beforeSend(event) {
      // Tag API generate errors as high priority
      const url = event.request?.url ?? "";
      if (url.includes("/api/generate")) {
        event.tags = { ...event.tags, critical_path: "true" };
        event.level = "error";
      }

      // Tag webhook failures
      if (url.includes("/api/webhooks")) {
        event.tags = { ...event.tags, webhook_failure: "true" };
      }

      // Strip sensitive headers
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["stripe-signature"];
      }

      return event;
    },
  });
}
