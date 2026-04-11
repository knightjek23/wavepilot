/**
 * Sentry client-side configuration — Sprint 4, Ticket #22
 *
 * Loaded automatically by @sentry/nextjs in the browser bundle.
 * Safe to skip when SENTRY_DSN is not set (dev / CI).
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
    release: `wavepilot@${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}`,

    // Performance — sample 20% of transactions in prod, 100% in dev
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    // Session replay — capture 10% of sessions, 100% on error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      Sentry.browserTracingIntegration(),
    ],

    // Filter out noise
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      /^Loading chunk \d+ failed/,
    ],

    // Tag every event with plan type for filtering
    beforeSend(event) {
      // Strip PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.category === "xhr" || bc.category === "fetch") {
            // Don't log request bodies (may contain user content)
            delete bc.data?.requestBody;
          }
          return bc;
        });
      }
      return event;
    },
  });
}
