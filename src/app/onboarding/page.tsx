"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  NICHE_OPTIONS,
  PLATFORM_OPTIONS,
  POSTING_GOAL_OPTIONS,
  OUTPUT_TYPE_OPTIONS,
} from "@/lib/constants";
import type { Platform, PostingGoal, OutputType } from "@/types";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [niche, setNiche] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [postingGoal, setPostingGoal] = useState<PostingGoal | "">("");
  const [outputType, setOutputType] = useState<OutputType | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveNiche = niche === "__custom" ? customNiche.trim() : niche;

  function togglePlatform(p: Platform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function canAdvance(): boolean {
    if (step === 1) return effectiveNiche.length > 0;
    if (step === 2) return platforms.length > 0;
    if (step === 3) return postingGoal !== "" && outputType !== "";
    return false;
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: effectiveNiche,
          platforms,
          postingGoal,
          outputType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-10 bg-[#1D9E75]" : s < step ? "w-10 bg-[#1D9E75]/40" : "w-10 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Niche */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">What&apos;s your niche?</h1>
            <p className="text-gray-500 mb-6">
              Pick the category that best describes your content or business.
            </p>

            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1D9E75] mb-3"
            >
              <option value="">Select a niche...</option>
              {NICHE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="__custom">Other (type your own)</option>
            </select>

            {niche === "__custom" && (
              <input
                type="text"
                placeholder="e.g. Vintage watches, Dog training, Vegan baking..."
                value={customNiche}
                onChange={(e) => setCustomNiche(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                maxLength={100}
                autoFocus
              />
            )}
          </div>
        )}

        {/* Step 2 — Platforms */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Where do you post?</h1>
            <p className="text-gray-500 mb-6">
              Select the platforms you&apos;re active on. We&apos;ll pull trending data from these.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlatform(p.value)}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all ${
                    platforms.includes(p.value)
                      ? "border-[#1D9E75] bg-[#1D9E75]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Goal + Output Type */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Almost there</h1>
            <p className="text-gray-500 mb-6">
              How often do you want to post, and what kind of plan do you need?
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posting frequency
            </label>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {POSTING_GOAL_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setPostingGoal(g.value)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    postingGoal === g.value
                      ? "border-[#1D9E75] bg-[#1D9E75]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              What do you want Wavepilot to generate?
            </label>
            <div className="flex flex-col gap-3">
              {OUTPUT_TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutputType(o.value)}
                  className={`rounded-lg border-2 px-4 py-4 text-left transition-all ${
                    outputType === o.value
                      ? "border-[#1D9E75] bg-[#1D9E75]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="block font-medium">{o.label}</span>
                  <span className="block text-sm text-gray-500 mt-1">{o.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={!canAdvance()}
              className="rounded-lg bg-[#1D9E75] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#177a5b] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canAdvance() || saving}
              className="rounded-lg bg-[#1D9E75] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#177a5b] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Generate my plan \u2192"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
