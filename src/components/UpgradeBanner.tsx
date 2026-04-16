"use client";

/**
 * UpgradeBanner — Persistent banner for free users, shown on dashboard.
 * Lighter touch than QuotaModal — shown before they hit the limit.
 */

import { useRouter } from "next/navigation";

interface UpgradeBannerProps {
  plan: string;
  used: number;
  limit: number;
}

export function UpgradeBanner({ plan, used, limit }: UpgradeBannerProps) {
  const router = useRouter();

  if (plan !== "free") return null;

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg bg-[#C84B24]/5 border border-[#C84B24]/20 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#C84B24]">
          Free plan: {used}/{limit} plans used this month
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Upgrade to Creator for 20 plans/mo, all output types, and PDF export.
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/pricing")}
        className="rounded-lg bg-[#C84B24] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A73C18] whitespace-nowrap"
      >
        Upgrade
      </button>
    </div>
  );
}
