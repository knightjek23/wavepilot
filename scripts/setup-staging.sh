#!/usr/bin/env bash
#
# Wavepilot — Staging Environment Setup (Sprint 4, Ticket #24)
#
# Creates a separate Vercel project for staging with all required env vars.
# Run this once to bootstrap, then deploy with `vercel --prod` from the staging branch.
#
# Prerequisites:
#   - Vercel CLI installed: npm i -g vercel
#   - Logged in: vercel login
#   - All staging env vars ready (separate Supabase project, Clerk dev instance, Stripe test keys)
#
# Usage:
#   chmod +x scripts/setup-staging.sh
#   ./scripts/setup-staging.sh

set -euo pipefail

echo "=== Wavepilot Staging Setup ==="
echo ""

PROJECT_NAME="wavepilot-staging"

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

echo "1. Creating Vercel project: $PROJECT_NAME"
echo "   (If already exists, this will link to it)"
echo ""

# Link or create the project
vercel link --yes --project "$PROJECT_NAME" 2>/dev/null || vercel project add "$PROJECT_NAME"

echo ""
echo "2. Setting environment variables..."
echo "   You'll be prompted for each value."
echo ""

# Required env vars for staging
ENV_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ANTHROPIC_API_KEY"
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  "CLERK_SECRET_KEY"
  "CLERK_WEBHOOK_SECRET"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "STRIPE_PRICE_CREATOR"
  "STRIPE_PRICE_PRO"
  "YOUTUBE_API_KEY"
  "REDDIT_CLIENT_ID"
  "REDDIT_CLIENT_SECRET"
  "RAPIDAPI_KEY"
  "SENTRY_DSN"
  "NEXT_PUBLIC_SENTRY_DSN"
  "NEXT_PUBLIC_APP_ENV"
  "NEXT_PUBLIC_APP_URL"
  "ALLOWED_ORIGINS"
  "BETTERUPTIME_HEARTBEAT_URL"
)

for var in "${ENV_VARS[@]}"; do
  echo -n "  $var: "
  read -r value
  if [ -n "$value" ]; then
    echo "$value" | vercel env add "$var" preview --force
    echo "    ✓ Set"
  else
    echo "    ⚠ Skipped (empty)"
  fi
done

echo ""
echo "3. Setting staging-specific config..."
vercel env add NEXT_PUBLIC_APP_ENV preview --force <<< "staging"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Deploy staging with:"
echo "  git checkout -b staging"
echo "  vercel --prod"
echo ""
echo "Or push to the 'staging' branch if git integration is set up."
echo ""
echo "Staging URL will be: https://$PROJECT_NAME.vercel.app"
echo ""
echo "Recommended: Set up a custom domain like staging.wavepilot.co"
