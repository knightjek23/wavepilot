"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PLATFORM_OPTIONS } from "@/lib/constants";
import {
  CAPTION_VIBE_OPTIONS,
  CAPTION_COUNT_OPTIONS,
} from "@/types";
import type { Platform, CaptionVibe, CaptionItem } from "@/types";

interface CaptionSetHistoryRow {
  id: string;
  topic: string;
  platform: Platform;
  vibe: CaptionVibe;
  count: number;
  items: CaptionItem[];
  created_at: string;
}

interface GenerateResponse {
  items: CaptionItem[];
  captionSetId: string | null;
  topic: string;
  platform: Platform;
  vibe: CaptionVibe;
  count: number;
  quota?: { used: number; limit: number; plan: string };
  warning?: string;
}

const MAX_TOPIC_LEN = 300;
const MIN_TOPIC_LEN = 10;

export default function CaptionsPage() {
  // Form state
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform | "">("");
  const [vibe, setVibe] = useState<CaptionVibe>("educational");
  const [count, setCount] = useState<number>(5);

  // Request state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState("");

  // Per-card copy feedback
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // History
  const [history, setHistory] = useState<CaptionSetHistoryRow[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/captions/list");
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.captionSets ?? []);
    } catch {
      // non-fatal — history just won't render
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleGenerate() {
    // Client-side validation (server re-validates)
    const trimmed = topic.trim();
    if (trimmed.length < MIN_TOPIC_LEN) {
      setError(`Topic must be at least ${MIN_TOPIC_LEN} characters.`);
      return;
    }
    if (trimmed.length > MAX_TOPIC_LEN) {
      setError(`Topic must be ${MAX_TOPIC_LEN} characters or fewer.`);
      return;
    }
    if (!platform) {
      setError("Select a platform.");
      return;
    }

    setGenerating(true);
    setError("");
    setResult(null);
    setCopiedIdx(null);

    try {
      const res = await fetch("/api/captions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, platform, vibe, count }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "QUOTA_EXCEEDED") {
          setError(
            `You've used ${data.used}/${data.limit} caption batches this month. Upgrade for more.`
          );
          return;
        }
        if (data.code === "RATE_LIMITED") {
          const mins = Math.ceil((data.retryAfter ?? 60) / 60);
          setError(`Too many requests. Try again in ~${mins} min.`);
          return;
        }
        throw new Error(data.error || "Generation failed");
      }

      setResult(data as GenerateResponse);
      // Refresh history in background
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function copyItem(item: CaptionItem, idx: number) {
    const tagLine =
      item.hashtags.length > 0 ? "\n\n" + item.hashtags.map((h) => `#${h}`).join(" ") : "";
    const text = `${item.hook}\n\n${item.caption}${tagLine}`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1800);
  }

  function loadFromHistory(row: CaptionSetHistoryRow) {
    setResult({
      items: row.items,
      captionSetId: row.id,
      topic: row.topic,
      platform: row.platform,
      vibe: row.vibe,
      count: row.count,
    });
    setTopic(row.topic);
    setPlatform(row.platform);
    setVibe(row.vibe);
    setCount(row.count);
    setShowHistory(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xl font-bold"
            style={{ color: "#C84B24" }}
          >
            Wavepilot
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              Dashboard
            </Link>
            <Link href="/captions" className="font-medium text-[#C84B24]">
              Captions
            </Link>
            <Link href="/history" className="text-gray-500 hover:text-gray-700">
              History
            </Link>
            <Link href="/pricing" className="text-gray-500 hover:text-gray-700">
              Upgrade
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Caption & Hook Generator</h1>
          <p className="mt-1 text-sm text-gray-500">
            Give me a topic and platform — I&apos;ll write scroll-stopping hooks and full
            captions tuned to that platform&apos;s voice.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                What&apos;s the post about?
              </label>
              <textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. '5 mistakes first-time freelancers make with pricing' or 'my morning routine that doubled my sales'"
                rows={3}
                maxLength={MAX_TOPIC_LEN}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C84B24]"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                <span>Be specific — &quot;pricing strategy&quot; is weaker than &quot;charging 2x my rate and keeping all my clients.&quot;</span>
                <span>
                  {topic.length}/{MAX_TOPIC_LEN}
                </span>
              </div>
            </div>

            <div className="min-w-[180px]">
              <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                How many?
              </label>
              <div className="flex gap-2">
                {CAPTION_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      count === n
                        ? "border-[#C84B24] bg-[#C84B24]/5 text-[#C84B24]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Platform */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                    platform === p.value
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

          {/* Vibe */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Vibe</label>
            <div className="grid gap-2 md:grid-cols-5">
              {CAPTION_VIBE_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVibe(v.value)}
                  className={`rounded-lg border-2 px-3 py-3 text-left text-sm transition-all ${
                    vibe === v.value
                      ? "border-[#C84B24] bg-[#C84B24]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="block font-medium">{v.label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{v.description}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 w-full rounded-lg bg-[#C84B24] py-3 text-sm font-semibold text-white transition-all hover:bg-[#A73C18] disabled:opacity-50"
          >
            {generating ? "Writing your captions..." : `Generate ${count} ${vibe} captions \u2192`}
          </button>
        </div>

        {/* Results */}
        {result && (
          <section className="mt-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#C84B24]/10 text-[#C84B24] px-3 py-1 text-xs font-medium capitalize">
                {result.platform}
              </span>
              <span className="rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-xs font-medium capitalize">
                {result.vibe}
              </span>
              <span className="rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-xs">
                {result.items.length} captions
              </span>
              {result.quota && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {result.quota.used}/
                  {result.quota.limit === Infinity ? "\u221E" : result.quota.limit} used
                </span>
              )}
              {result.warning && (
                <span className="rounded-full bg-yellow-50 text-yellow-800 px-3 py-1 text-xs">
                  {result.warning}
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {result.items.map((item, idx) => (
                <article
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-white p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-gray-400">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyItem(item, idx)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
                        copiedIdx === idx
                          ? "border-[#C84B24] bg-[#C84B24] text-white"
                          : "border-gray-300 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {copiedIdx === idx ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  <h3 className="text-base font-semibold leading-snug text-gray-900">
                    {item.hook}
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {item.caption}
                  </p>

                  {item.hashtags.length > 0 && (
                    <p className="mt-3 text-sm text-[#C84B24]">
                      {item.hashtags.map((h) => `#${h}`).join(" ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* History */}
        <section className="mt-10 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <span>{showHistory ? "\u25BC" : "\u25B6"}</span>
            <span>
              Recent captions
              {history && history.length > 0 ? ` (${history.length})` : ""}
            </span>
          </button>

          {showHistory && (
            <div className="mt-4">
              {history === null && (
                <p className="text-sm text-gray-400">Loading…</p>
              )}
              {history && history.length === 0 && (
                <p className="text-sm text-gray-400">
                  No history yet. Your generated caption sets will show up here.
                </p>
              )}
              {history && history.length > 0 && (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                  {history.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => loadFromHistory(row)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {row.topic}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            <span className="capitalize">{row.platform}</span> ·{" "}
                            <span className="capitalize">{row.vibe}</span> ·{" "}
                            {row.count} captions ·{" "}
                            {new Date(row.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-xs text-[#C84B24]">Load \u2192</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
