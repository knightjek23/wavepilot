"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "2 plans per month",
      "1 platform per plan",
      "Weekly Content Calendar only",
      "In-app viewing",
    ],
    limits: ["No PDF export", "No trend reports", "No growth strategy"],
    cta: "Current Plan",
    plan: "free",
    highlighted: false,
  },
  {
    name: "Creator",
    price: "$19",
    period: "/month",
    features: [
      "20 plans per month",
      "All platforms",
      "All 3 output types",
      "PDF export",
      "Plan history",
    ],
    limits: [],
    cta: "Upgrade to Creator",
    plan: "creator",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    features: [
      "Unlimited plans",
      "All platforms",
      "All 3 output types",
      "PDF export",
      "Plan history",
      "Priority generation",
      "Trend alerts (coming soon)",
    ],
    limits: [],
    cta: "Upgrade to Pro",
    plan: "pro",
    highlighted: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleCheckout(plan: string) {
    if (plan === "free") return;

    setLoading(plan);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start checkout");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
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

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Choose your plan</h2>
          <p className="mt-2 text-gray-500">
            Stop guessing. Start growing. Pick the plan that fits.
          </p>
        </div>

        {error && (
          <p className="text-center text-sm text-red-600 mb-6">{error}</p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border-2 bg-white p-6 flex flex-col ${
                tier.highlighted
                  ? "border-[#1D9E75] shadow-lg scale-[1.02]"
                  : "border-gray-200"
              }`}
            >
              {tier.highlighted && (
                <span className="mb-3 inline-block self-start rounded-full bg-[#1D9E75] px-3 py-0.5 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}

              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-sm text-gray-500">{tier.period}</span>
              </div>

              <ul className="mt-6 space-y-2 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-[#1D9E75] mt-0.5">&#10003;</span>
                    {f}
                  </li>
                ))}
                {tier.limits.map((l) => (
                  <li key={l} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="mt-0.5">&#10007;</span>
                    {l}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleCheckout(tier.plan)}
                disabled={tier.plan === "free" || loading === tier.plan}
                className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  tier.highlighted
                    ? "bg-[#1D9E75] text-white hover:bg-[#177a5b]"
                    : tier.plan === "free"
                      ? "bg-gray-100 text-gray-400 cursor-default"
                      : "border border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75]/5"
                } disabled:opacity-50`}
              >
                {loading === tier.plan ? "Redirecting..." : tier.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          All plans are billed monthly. Cancel anytime from the Customer Portal.
        </p>
      </div>
    </main>
  );
}
