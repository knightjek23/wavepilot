"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SavedPlan {
  id: string;
  output_type: string;
  niche: string;
  platforms: string[];
  created_at: string;
  content: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SavedPlan | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to load plans");
      const data = await res.json();
      setPlans(data.plans ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function outputLabel(type: string): string {
    switch (type) {
      case "calendar": return "Weekly Calendar";
      case "trends": return "Trend Report";
      case "strategy": return "Growth Strategy";
      default: return type;
    }
  }

  return (
    <main className="min-h-screen bg-[#fafaf9]">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: "#1D9E75" }}>
            Wavepilot
          </h1>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Back to Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="text-lg font-semibold mb-4">Plan History</h2>

        {loading && <p className="text-gray-500">Loading plans...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && plans.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500 mb-4">No plans yet. Generate your first one!</p>
            <a
              href="/dashboard"
              className="inline-block rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#177a5b]"
            >
              Generate a plan
            </a>
          </div>
        )}

        {!loading && plans.length > 0 && !selectedPlan && (
          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[#1D9E75]/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="rounded-full bg-[#1D9E75]/10 text-[#1D9E75] px-2.5 py-0.5 text-xs font-medium">
                      {outputLabel(plan.output_type)}
                    </span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{plan.niche}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(plan.created_at)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.platforms.map((p) => (
                    <span key={p} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {p}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-400 line-clamp-2">
                  {plan.content.slice(0, 200)}...
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Plan detail view */}
        {selectedPlan && (
          <div>
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              &larr; Back to list
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="rounded-full bg-[#1D9E75]/10 text-[#1D9E75] px-2.5 py-0.5 text-xs font-medium">
                {outputLabel(selectedPlan.output_type)}
              </span>
              <span className="text-sm text-gray-600">{selectedPlan.niche}</span>
              <span className="text-xs text-gray-400">{formatDate(selectedPlan.created_at)}</span>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {selectedPlan.content}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <a
                href={`/api/export/pdf?planId=${selectedPlan.id}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Export PDF
              </a>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(selectedPlan.content)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Copy Markdown
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
