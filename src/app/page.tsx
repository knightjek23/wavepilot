"use client";

/**
 * Landing page — wavepilot.co
 *
 * Design System v2 — burnt orange + editorial neutrals.
 * Tokens in docs/wavepilot-design-system-v2.md.
 *
 * Waitlist-gated launch page with email capture.
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
    <main className="min-h-screen bg-[#FAFAF9] text-[#1F1F1F]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#DDDDDD] bg-[#FAFAF9]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2 text-[24px] font-medium text-black" style={{ fontFamily: "var(--font-display)" }}>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-white text-[13px] font-semibold"
              style={{ backgroundColor: "#C84B24", fontFamily: "var(--font-body)" }}
            >
              W
            </span>
            Wavepilot
          </a>
          <div className="flex items-center gap-8">
            <a href="#how-it-works" className="hidden text-[15px] font-medium text-black hover:text-[#C84B24] transition-colors sm:block">
              How it works
            </a>
            <a href="#pricing" className="hidden text-[15px] font-medium text-black hover:text-[#C84B24] transition-colors sm:block">
              Pricing
            </a>
            <a
              href="/sign-in"
              className="rounded-[6px] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#A73C18]"
              style={{ backgroundColor: "#C84B24" }}
            >
              Sign in
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pb-20 pt-36 sm:pt-44">
        {/* Soft editorial wash — no harsh gradient */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(200, 75, 36, 0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          {/* Eyebrow */}
          <div className="mb-8 inline-flex items-center gap-2 border-b border-[#C84B24] px-1 pb-1">
            <span
              className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#C84B24]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Early Access — Join the Waitlist
            </span>
          </div>

          <h1
            className="mx-auto max-w-3xl text-[40px] font-medium leading-[1.1] text-[#1F1F1F] sm:text-[52px] md:text-[60px] md:leading-[1.08]"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Know what to post{" "}
            <span className="text-[#C84B24]">before everyone else</span>.
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl text-[18px] leading-[1.5] text-[#7A808C] sm:text-[22px] sm:leading-[1.45]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Wavepilot turns live trending data into your personalized social media game plan — in under three minutes.
          </p>

          {/* Waitlist form */}
          {status === "success" ? (
            <div className="mx-auto mt-10 max-w-md rounded-[12px] border border-[#C84B24]/30 bg-[#FCEEE8] p-6 text-center">
              <p className="text-[17px] font-medium text-[#802E14]">{message}</p>
              {position !== null && (
                <p className="mt-2 text-[14px] text-[#C84B24]">
                  You&apos;re #{position} on the list. The first 50 get Creator free for 30 days.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-[6px] border border-[#E4E5EA] bg-white px-4 py-3 text-[15px] text-[#1F1F1F] placeholder-[#9196A0] outline-none transition-all focus:border-[#C84B24] focus:ring-2 focus:ring-[#C84B24]/20"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="whitespace-nowrap rounded-[6px] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#A73C18] disabled:opacity-60"
                style={{ backgroundColor: "#C84B24" }}
              >
                {status === "loading" ? "Joining..." : "Join waitlist"}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="mt-3 text-[14px] text-[#B23A2A]">{message}</p>
          )}

          <p className="mt-4 text-[13px] text-[#9196A0]">
            Free to join. No credit card required. First 50 users get Creator tier free for 30 days.
          </p>

          {/* Hidden name field — progressive enhancement for waitlist */}
          <input
            type="hidden"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </section>

      {/* Social proof / stat band */}
      <section className="border-y border-[#DDDDDD] bg-white py-14">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p
            className="mb-8 text-[12px] font-medium uppercase tracking-[0.12em] text-[#7D7D7D]"
            style={{ fontFamily: "var(--font-body)" }}
          >
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
                <p
                  className="text-[32px] font-medium text-[#1F1F1F]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.stat}
                </p>
                <p className="mt-1 text-[13px] font-medium text-[#9196A0]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p
            className="text-center text-[12px] font-medium uppercase tracking-[0.12em] text-[#C84B24]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            How it works
          </p>
          <h2
            className="mt-3 text-center text-[32px] font-medium text-[#1F1F1F] sm:text-[44px]"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Three steps to a content plan that actually works.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[16px] text-[#7A808C]">
            From &quot;what should I post?&quot; to a complete strategy — no templates, no guesswork.
          </p>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Tell us your niche",
                desc: "Pick your niche and the platforms you create for. Wavepilot handles the rest.",
              },
              {
                step: "02",
                title: "We scan what's trending",
                desc: "Live data from YouTube, TikTok, Reddit, and Twitter — filtered and scored by engagement.",
              },
              {
                step: "03",
                title: "Get your game plan",
                desc: "A personalized content calendar, trend report, or growth strategy — ready to execute.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-[12px] border border-[#DDDDDD] bg-white p-8 transition-colors hover:border-[#C84B24]/40"
              >
                <p
                  className="text-[13px] font-medium text-[#C84B24]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {item.step}
                </p>
                <h3
                  className="mt-6 text-[22px] font-medium text-[#1F1F1F]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.55] text-[#7A808C]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Output types */}
      <section className="border-y border-[#DDDDDD] bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p
            className="text-center text-[12px] font-medium uppercase tracking-[0.12em] text-[#C84B24]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Output
          </p>
          <h2
            className="mt-3 text-center text-[32px] font-medium text-[#1F1F1F] sm:text-[44px]"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Three plan types. One goal.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[16px] text-[#7A808C]">
            Choose the output that matches how you work.
          </p>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
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
              <div
                key={item.title}
                className="rounded-[12px] border border-[#DDDDDD] bg-[#FAFAF9] p-8"
              >
                <span className="inline-block rounded-full border border-[#C84B24]/30 bg-[#FCEEE8] px-3 py-1 text-[12px] font-medium text-[#802E14]">
                  {item.badge}
                </span>
                <h3
                  className="mt-5 text-[22px] font-medium text-[#1F1F1F]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.55] text-[#7A808C]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p
            className="text-center text-[12px] font-medium uppercase tracking-[0.12em] text-[#C84B24]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Pricing
          </p>
          <h2
            className="mt-3 text-center text-[32px] font-medium text-[#1F1F1F] sm:text-[44px]"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Simple pricing.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[16px] text-[#7A808C]">
            Start free. Upgrade when you&apos;re ready to go all-in.
          </p>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
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
                features: [
                  "Unlimited plans",
                  "All platforms",
                  "All output types",
                  "PDF export",
                  "Priority support",
                  "API access (coming)",
                ],
                cta: "Join waitlist",
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-[12px] border p-8 ${
                  tier.highlight
                    ? "border-[#C84B24] bg-[#FCEEE8]"
                    : "border-[#DDDDDD] bg-white"
                }`}
              >
                {tier.highlight && (
                  <span className="mb-4 inline-block rounded-full bg-[#C84B24] px-3 py-1 text-[12px] font-medium text-white">
                    Most popular
                  </span>
                )}
                <h3
                  className="text-[22px] font-medium text-[#1F1F1F]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {tier.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span
                    className="text-[36px] font-medium text-[#1F1F1F]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {tier.price}
                  </span>
                  <span className="text-[14px] text-[#7A808C]">{tier.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[14px] text-[#1F1F1F]">
                      <span className="mt-[6px] inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-[#C84B24]" />
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
                  className={`mt-8 block w-full rounded-[6px] py-3 text-center text-[14px] font-medium transition-colors ${
                    tier.highlight
                      ? "bg-[#C84B24] text-white hover:bg-[#A73C18]"
                      : "border border-[#DDDDDD] text-[#1F1F1F] hover:bg-[#F4F3F1]"
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
      <section className="border-t border-[#DDDDDD] bg-white py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2
            className="text-[32px] font-medium text-[#1F1F1F] sm:text-[44px]"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Stop guessing. Start growing.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] text-[#7A808C]">
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
                className="flex-1 rounded-[6px] border border-[#E4E5EA] bg-white px-4 py-3 text-[15px] text-[#1F1F1F] placeholder-[#9196A0] outline-none transition-all focus:border-[#C84B24] focus:ring-2 focus:ring-[#C84B24]/20"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="whitespace-nowrap rounded-[6px] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#A73C18] disabled:opacity-60"
                style={{ backgroundColor: "#C84B24" }}
              >
                {status === "loading" ? "Joining..." : "Join waitlist"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#DDDDDD] py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <p className="text-[12px] text-[#9196A0]">
            &copy; {new Date().getFullYear()} Wavepilot. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="/sign-in" className="text-[12px] text-[#9196A0] hover:text-[#C84B24] transition-colors">
              Sign in
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
