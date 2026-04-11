/**
 * Sentry edge runtime configuration — Sprint 4, Ticket #22
 *
 * Used by middleware and edge API routes.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
    release: `wavepilot@${process.env.npm_package_version ?? "0.1.0"}`,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}
