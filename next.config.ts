import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Strict mode for catching React issues early
  reactStrictMode: true,

  // Lock allowed image domains
  images: {
    remotePatterns: [],
  },

  // Server-only env vars — never exposed to client bundle
  serverExternalPackages: [],

  // Headers for security (Ticket #26 hardened)
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: isProd ? "max-age=63072000; includeSubDomains; preload" : "max-age=0",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.clerk.dev https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://img.clerk.com",
              "font-src 'self'",
              "connect-src 'self' https://*.clerk.dev https://*.supabase.co https://*.sentry.io",
              "frame-src https://js.clerk.dev https://challenges.cloudflare.com https://checkout.stripe.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// Wrap with Sentry only when DSN is available
const sentryConfig = {
  // Suppress Sentry CLI logs in build output
  silent: true,
  // Upload source maps for better stack traces
  widenClientFileUpload: true,
  // Hide source maps from end users
  hideSourceMaps: true,
  // Disable telemetry
  disableLogger: true,
};

// Conditional Sentry wrapping — skip when DSN is not set (CI / dev)
const hasSentry = !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export default hasSentry
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;
