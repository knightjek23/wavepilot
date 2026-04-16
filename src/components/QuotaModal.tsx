"use client";

/**
 * QuotaModal — Soft paywall shown when a user hits their plan limit.
 *
 * Displays current usage (e.g. "2/2 plans used this month")
 * and an upgrade CTA. Never shows a hard wall — always explains
 * what they've used and what upgrading unlocks.
 *
 * Sprint 3, Ticket #20
 */

import { useRouter } from "next/navigation";

interface QuotaModalProps {
  used: number;
  limit: number;
  plan: string;
  onClose: () => void;
}

export function QuotaModal({ used, limit, plan, onClose }: QuotaModalProps) {
  const router = useRouter();

  const planLabel = plan === "free" ? "Free" : plan === "creator" ? "Creator" : "Pro";
  const nextPlan = plan === "free" ? "Creator" : "Pro";
  const nextPrice = plan === "free" ? "$19" : "$49";
  const nextLimit = plan === "free" ? "20" : "unlimited";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        {/* Usage bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">Monthly plans used</span>
            <span className="text-gray-500">
              {used}/{limit === Infinity ? "\u221e" : limit}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#C84B24] transition-all"
              style={{ width: `${Math.min((used / (limit === Infinity ? 1 : limit)) * 100, 100)}%` }}
            />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900">
          You&apos;ve used all your {planLabel} plans this month
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Upgrade to {nextPlan} for {nextLimit} plans/month, all output types, PDF export,
          and more — starting at {nextPrice}/mo.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/pricing")}
            className="flex-1 rounded-lg bg-[#C84B24] py-2.5 text-sm font-semibold text-white hover:bg-[#A73C18]"
          >
            Upgrade to {nextPlan}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
