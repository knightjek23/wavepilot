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
    <div className="mb-6 flex items-center justify-between rounded-lg bg-[#1D9E75]/5 border border-[#1D9E75]/20 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#1D9E75]">
          Free plan: {used}/{limit} plans used this month
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Upgrade to Creator for 20 plans/mo, all output types, and PDF export.
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/pricing")}
        className="rounded-lg bg-[#1D9E75] px-4 py-2 text-xs font-semibold text-white hover:bg-[#177a5b] whitespace-nowrap"
      >
        Upgrade
      </button>
    </div>
  );
}
