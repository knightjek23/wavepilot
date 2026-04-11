// ============================================================
// Wavepilot — Shared Types
// ============================================================

// --- User & Onboarding ---

export type Platform = "tiktok" | "instagram" | "youtube" | "reddit" | "twitter" | "linkedin" | "facebook";

export type OutputType = "calendar" | "trends" | "strategy";

export type PostingGoal = "daily" | "3-4x/week" | "2-3x/week" | "weekly";

export type PlanTier = "free" | "creator" | "pro";

export interface UserProfile {
  id: string;
  email: string;
  niche: string;
  platforms: Platform[];
  postingGoal: PostingGoal;
  planTypePref: OutputType;
  createdAt: string; // ISO 8601 UTC
}

// --- Trend Data ---

export interface TrendItem {
  id: string;
  platform: Platform;
  title: string;
  description: string;
  url: string | null;
  engagementScore: number; // normalised 0–100
  momentum: "rising" | "peak" | "declining";
  hashtags: string[];
  fetchedAt: string; // ISO 8601 UTC
}

export interface TrendPayload {
  niche: string;
  platforms: Platform[];
  items: TrendItem[];
  fetchedAt: string;
}

// --- Plan Generation ---

export interface GeneratePlanRequest {
  niche: string;
  platforms: Platform[];
  postingGoal: PostingGoal;
  outputType: OutputType;
}

export interface GeneratedPlan {
  id: string;
  userId: string;
  outputType: OutputType;
  niche: string;
  platforms: Platform[];
  content: string; // raw markdown from Claude
  promptTokens: number;
  createdAt: string;
}

// --- Usage & Billing ---

export interface UsageEvent {
  id: string;
  userId: string;
  planId: string | null;
  billingPeriod: string; // e.g. "2026-04"
  createdAt: string;
}

export interface Subscription {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: PlanTier;
  status: "active" | "past_due" | "canceled";
  currentPeriodEnd: string;
}

// --- API Responses ---

export interface ApiError {
  error: string;
  code: string;
  retryAfter?: number; // seconds, present on 429
}

export interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
}

// --- Plan Limits ---

export const PLAN_LIMITS: Record<PlanTier, number> = {
  free: 2,
  creator: 20,
  pro: Infinity,
};

export const PLAN_PLATFORM_LIMITS: Record<PlanTier, number> = {
  free: 1,
  creator: Infinity,
  pro: Infinity,
};
