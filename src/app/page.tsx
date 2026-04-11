"use client";

/**
 * Landing page — wavepilot.co
 *
 * Waitlist-gated launch page with email capture.
 * Design matches the brand: teal #1D9E75, Plus Jakarta Sans, clean and modern.
 *
 * Sprint 4, Ticket #25
 */

import { useState, type FormEvent } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState<number | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }

      setStatus("success");
      setMessage(data.message ?? "You're on the list!");
      setPosition(data.position ?? null);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-5xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold"
              style={{ backgroundColor: "#1D9E75" }}
            >
              W
            </span>
            Wavepilot
          </a>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hidden text-sm font-medium text-gray-500 hover:text-gray-800 sm:block">
              How it works
            </a>
            <a href="#pricing" className="hidden text-sm font-medium text-gray-500 hover:text-gray-800 sm:block">
              Pricing
            </a>
            <a
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#1D9E75" }}
            >
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-32 sm:pt-40">
        {/* Background gradient */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% -10%, #E1F5EE 0%, transparent 70%)",
          }}
        />
        {/* Grid lines */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(30,30,28,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,30,28,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#1D9E75]/20 bg-[#E1F5EE] px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1D9E75]" />
            <span className="text-xs font-semibold tracking-wide text-[#0F6E56]" style={{ fontFamily: "monospace" }}>
              EARLY ACCESS — JOIN THE WAITLIST
            </span>
          </div>

          <h1
            className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl md:text-6xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            Know what to post{" "}
            <span className="relative" style={{ color: "#1D9E75" }}>
              before everyone else
              <span
                className="absolute bottom-0 left-0 h-[3px] w-full rounded-full"
                style={{ backgroundColor: "#5DCAA5" }}
              />
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-lg text-gray-500 sm:text-xl">
            Wavepilot turns live trending data into your personalized social media game plan — in under 3 minutes.
          </p>

          {/* Waitlist form */}
          {status === "success" ? (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-[#1D9E75]/20 bg-[#E1F5EE] p-6 text-center">
              <p className="text-lg font-semibold text-[#0F6E56]">{message}</p>
              {position !== null && (
                <p className="mt-2 text-sm text-[#1D9E75]">
                  You&apos;re #{position} on the list. The first 50 get Creator free for 30 days.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="whitespace-nowrap rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#1D9E75" }}
              >
                {status === "loading" ? "Joining..." : "Join waitlist →"}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="mt-3 text-sm text-red-600">{message}</p>
          )}

          <p className="mt-4 text-xs text-gray-400">
            Free to join. No credit card required. First 50 users get Creator tier free for 30 days.
          </p>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-gray-100 bg-[#fafaf9] py-12">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Built for creators who want to grow, not guess
          </p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { stat: "4", label: "Platforms scanned" },
              { stat: "<3 min", label: "To a full plan" },
              { stat: "Live", label: "Trending data" },
              { stat: "AI", label: "Personalized output" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-2xl font-bold" style={{ color: "#1D9E75" }}>{item.stat}</p>
                <p className="mt-1 text-sm text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">How it works</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-gray-500">
            Three steps from &quot;what should I post?&quot; to a complete content strategy.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Tell us your niche",
                desc: "Pick your niche and the platforms you create for. Wavepilot handles the rest.",
                icon: "🎯",
              },
              {
                step: "2",
                title: "We scan what's trending",
                desc: "Live data from YouTube, TikTok, Reddit, and Twitter — filtered and scored by engagement.",
                icon: "📡",
              },
              {
                step: "3",
                title: "Get your game plan",
                desc: "A personalized content calendar, trend report, or growth strategy — ready to execute.",
                icon: "🚀",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#E1F5EE] text-xl">
                  {item.icon}
                </div>
                <p className="mb-1 text-xs font-semibold text-[#1D9E75]" style={{ fontFamily: "monospace" }}>
                  STEP {item.step}
                </p>
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Output types */}
      <section className="border-t border-gray-100 bg-[#fafaf9] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">Three plan types. One goal.</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-gray-500">
            Choose the output that matches how you work.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Weekly Calendar",
                desc: "Day-by-day posting schedule with specific content ideas, hashtags, and best times to post.",
                badge: "Most popular",
              },
              {
                title: "Trend Report",
                desc: "Deep dive into what's trending in your niche right now, with actionable post ideas for each trend.",
                badge: "Data-rich",
              },
              {
                title: "Growth Strategy",
                desc: "Big-picture content strategy with platform-specific tactics, audience analysis, and growth levers.",
                badge: "Strategic",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-6">
                <span className="inline-block rounded-full bg-[#1D9E75]/10 px-3 py-1 text-xs font-medium text-[#1D9E75]">
                  {item.badge}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">Simple pricing</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-gray-500">
            Start free. Upgrade when you&apos;re ready to go all-in.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                features: ["2 plans/month", "1 platform", "Calendar output only"],
                cta: "Join waitlist",
                highlight: false,
              },
              {
                name: "Creator",
                price: "$12",
                period: "/month",
                features: ["20 plans/month", "All platforms", "All output types", "PDF export", "Plan history"],
                cta: "Join waitlist",
                highlight: true,
              },
              {
                name: "Pro",
                price: "$29",
                period: "/month",
                features: ["Unlimited plans", "All platforms", "All output types", "PDF export", "Priority support", "API access (coming)"],
                cta: "Join waitlist",
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border-2 p-6 ${
                  tier.highlight
                    ? "border-[#1D9E75] bg-[#1D9E75]/5"
                    : "border-gray-200 bg-white"
                }`}
              >
                {tier.highlight && (
                  <span className="mb-3 inline-block rounded-full bg-[#1D9E75] px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
                  <span className="text-sm text-gray-500">{tier.period}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <span style={{ color: "#1D9E75" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    tier.highlight
                      ? "bg-[#1D9E75] text-white hover:bg-[#177a5b]"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100 bg-[#fafaf9] py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Stop guessing. Start growing.</h2>
          <p className="mx-auto mt-3 max-w-md text-gray-500">
            Join the waitlist and be first to get your personalized content game plan.
          </p>
          {status !== "success" && (
            <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="whitespace-nowrap rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#1D9E75" }}
              >
                {status === "loading" ? "Joining..." : "Join waitlist →"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Wavepilot. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="/sign-in" className="text-xs text-gray-400 hover:text-gray-600">Sign In</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
