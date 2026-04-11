/**
 * Shared constants used across onboarding, UI, and services.
 */

import type { Platform, OutputType, PostingGoal } from "@/types";

// --- Niche options for onboarding dropdown ---
export const NICHE_OPTIONS = [
  "Fitness & Health",
  "Food & Cooking",
  "Fashion & Beauty",
  "Tech & Gadgets",
  "Finance & Investing",
  "Travel & Adventure",
  "Gaming",
  "Education & Learning",
  "Music & Entertainment",
  "Home & DIY",
  "Pets & Animals",
  "Parenting & Family",
  "Real Estate",
  "Automotive",
  "Photography & Videography",
  "Business & Entrepreneurship",
  "Art & Design",
  "Sports",
  "Landscaping & Outdoor",
  "HVAC & Home Services",
] as const;

// --- Platform options ---
export const PLATFORM_OPTIONS: { value: Platform; label: string; icon: string }[] = [
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "youtube", label: "YouTube", icon: "▶️" },
  { value: "twitter", label: "Twitter / X", icon: "𝕏" },
  { value: "reddit", label: "Reddit", icon: "🟠" },
  { value: "linkedin", label: "LinkedIn", icon: "💼" },
  { value: "facebook", label: "Facebook", icon: "📘" },
];

// --- Posting goal options ---
export const POSTING_GOAL_OPTIONS: { value: PostingGoal; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "3-4x/week", label: "3–4 times per week" },
  { value: "2-3x/week", label: "2–3 times per week" },
  { value: "weekly", label: "Once a week" },
];

// --- Output type options ---
export const OUTPUT_TYPE_OPTIONS: { value: OutputType; label: string; description: string }[] = [
  {
    value: "calendar",
    label: "Weekly Content Calendar",
    description: "A 7-day posting schedule with ideas, hooks, and hashtags for each day.",
  },
  {
    value: "trends",
    label: "Trend Report + Post Ideas",
    description: "Top trending topics in your niche with 2–3 post angles each.",
  },
  {
    value: "strategy",
    label: "Full Growth Strategy",
    description: "30-day roadmap with calendar, hashtag bank, and platform-specific tactics.",
  },
];
