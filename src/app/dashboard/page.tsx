"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PLATFORM_OPTIONS,
  POSTING_GOAL_OPTIONS,
  OUTPUT_TYPE_OPTIONS,
  NICHE_OPTIONS,
} from "@/lib/constants";
import type { Platform, PostingGoal, OutputType } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<{
    content: string;
    planId: string;
    outputType: string;
    quota: { used: number; limit: number; plan: string };
    trendSources: Record<string, string>;
  } | null>(null);
  const [error, setError] = useState("");

  // Form state — defaults from last session (could be loaded from profile)
  const [niche, setNiche] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [postingGoal, setPostingGoal] = useState<PostingGoal | "">("");
  const [outputType, setOutputType] = useState<OutputType | "">("");

  // Adjust mode
  const [adjustPrompt, setAdjustPrompt] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);

  function togglePlatform(p: Platform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleGenerate() {
    if (!niche || platforms.length === 0 || !postingGoal || !outputType) {
      setError("Fill in all fields to generate a plan.");
      return;
    }

    setGenerating(true);
    setError("");
    setPlan(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, platforms, postingGoal, outputType }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "QUOTA_EXCEEDED") {
          setError(`You've used ${data.used}/${data.limit} plans this month. Upgrade for more.`);
          return;
        }
        throw new Error(data.error || "Generation failed");
      }

      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: "#C84B24" }}>
            Wavepilot
          </h1>
          <div className="flex items-center gap-4">
            <a href="/captions" className="text-sm text-gray-500 hover:text-gray-700">
              Captions
            </a>
            <a href="/history" className="text-sm text-gray-500 hover:text-gray-700">
              Plan History
            </a>
            <a href="/pricing" className="text-sm text-gray-500 hover:text-gray-700">
              Upgrade
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Generate form */}
        {!plan && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Generate a content plan</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Niche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niche</label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C84B24]"
                >
                  <option value="">Select...</option>
                  {NICHE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Posting goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posting frequency</label>
                <select
                  value={postingGoal}
                  onChange={(e) => setPostingGoal(e.target.value as PostingGoal)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C84B24]"
                >
                  <option value="">Select...</option>
                  {POSTING_GOAL_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Platforms */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                      platforms.includes(p.value)
                        ? "border-[#C84B24] bg-[#C84B24]/5 text-[#C84B24]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Output type */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan type</label>
              <div className="grid gap-2 md:grid-cols-3">
                {OUTPUT_TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOutputType(o.value)}
                    className={`rounded-lg border-2 px-3 py-3 text-left text-sm transition-all ${
                      outputType === o.value
                        ? "border-[#C84B24] bg-[#C84B24]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="block font-medium">{o.label}</span>
                    <span className="block text-xs text-gray-500 mt-1">{o.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="mt-6 w-full rounded-lg bg-[#C84B24] py-3 text-sm font-semibold text-white transition-all hover:bg-[#A73C18] disabled:opacity-50"
            >
              {generating ? "Generating your plan..." : "Generate my plan \u2192"}
            </button>
          </div>
        )}

        {/* Quick-access CTA: captions generator */}
        {!plan && (
          <a
            href="/captions"
            className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all hover:border-[#C84B24] hover:bg-[#C84B24]/5"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Need captions fast?
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Drop a topic &mdash; get platform-tuned hooks + captions in seconds.
              </p>
            </div>
            <span className="text-sm font-medium text-[#C84B24]">
              Open generator &rarr;
            </span>
          </a>
        )}

        {/* Plan output */}
        {plan && (
          <div>
            {/* Summary chips */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="rounded-full bg-[#C84B24]/10 text-[#C84B24] px-3 py-1 text-xs font-medium">
                {plan.outputType === "calendar" ? "Weekly Calendar" : plan.outputType === "trends" ? "Trend Report" : "Growth Strategy"}
              </span>
              {Object.entries(plan.trendSources).map(([platform, status]) => (
                <span
                  key={platform}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    status === "ok" ? "bg-green-50 text-green-700" : status === "failed" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {platform}: {status}
                </span>
              ))}
              {plan.quota && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {plan.quota.used}/{plan.quota.limit === Infinity ? "\u221e" : plan.quota.limit} plans used
                </span>
              )}
            </div>

            {/* Rendered markdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(plan.content) }}
              />
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-lg border border-[#C84B24] px-4 py-2 text-sm font-medium text-[#C84B24] hover:bg-[#C84B24]/5"
              >
                {generating ? "Regenerating..." : "Regenerate"}
              </button>

              <button
                type="button"
                onClick={() => setShowAdjust(!showAdjust)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Adjust
              </button>

              <a
                href={`/api/export/pdf?planId=${plan.planId}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Export PDF
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(plan.content);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Copy Markdown
              </button>

              <button
                type="button"
                onClick={() => setPlan(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                New Plan
              </button>
            </div>

            {/* Adjust prompt */}
            {showAdjust && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                <input
                  type="text"
                  value={adjustPrompt}
                  onChange={(e) => setAdjustPrompt(e.target.value)}
                  placeholder='e.g. "Make it more educational" or "Focus more on Reels"'
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C84B24]"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Adjust functionality coming in a future update. For now, regenerate with different settings above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Minimal markdown → HTML converter.
 * Handles headers, bold, italic, lists, links, and code blocks.
 * For a real app, swap this for react-markdown or a proper parser.
 */
function markdownToHtml(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Headers
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Unordered lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Horizontal rules
    .replace(/^---$/gm, "<hr>")
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br>");

  // Wrap in paragraph
  html = `<p>${html}</p>`;

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);

  return html;
}
