"use client";

/**
 * Global error boundary — catches unhandled errors in the root layout.
 * Reports to Sentry when configured.
 *
 * Sprint 4, Ticket #22
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ color: "#1D9E75", fontSize: "1.5rem", fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6b7280", marginTop: "0.5rem", fontSize: "0.875rem" }}>
            We&apos;ve been notified and are looking into it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#1D9E75",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ color: "#9ca3af", marginTop: "1rem", fontSize: "0.75rem" }}>
              Error ID: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
