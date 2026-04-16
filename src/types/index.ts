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

// --- Captions / Hooks ---

export type CaptionVibe = "educational" | "funny" | "bold" | "story" | "hype";

export interface CaptionItem {
  hook: string;         // first line / scroll-stopper
  caption: string;      // full caption body (no hashtags)
  hashtags: string[];   // platform-appropriate tags
}

export interface CaptionSet {
  id: string;
  userId: string;
  topic: string;
  platform: Platform;
  vibe: CaptionVibe;
  count: number;
  items: CaptionItem[];
  promptTokens: number;
  createdAt: string;
}

export interface GenerateCaptionsRequest {
  topic: string;
  platform: Platform;
  vibe: CaptionVibe;
  count: number;
}

// --- Usage & Billing ---

export type UsageEventType = "plan" | "caption";

export interface UsageEvent {
  id: string;
  userId: string;
  planId: string | null;
  captionSetId: string | null;
  eventType: UsageEventType;
  success: boolean;
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

// --- Caption quota (monthly generations, not individual captions) ---
export const CAPTION_LIMITS: Record<PlanTier, number> = {
  free: 5,
  creator: 100,
  pro: Infinity,
};

export const CAPTION_VIBE_OPTIONS: {
  value: CaptionVibe;
  label: string;
  description: string;
}[] = [
  { value: "educational", label: "Educational", description: "Inform, teach, share a tip" },
  { value: "funny", label: "Funny", description: "Playful, witty, relatable" },
  { value: "bold", label: "Bold", description: "Strong opinion, hot take" },
  { value: "story", label: "Story", description: "Narrative-driven, personal" },
  { value: "hype", label: "Hype", description: "High energy, launch-style" },
];

export const CAPTION_COUNT_OPTIONS = [5, 10] as const;
