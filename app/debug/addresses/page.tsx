// app/debug/addresses/page.tsx
"use client";

import Link from "next/link";
import * as ADDR from "@/lib/addresses";

const EXPLORER = "https://basescan.org/address";

const ADDRS = [
  { key: "PROFILE_REGISTRY", label: "Profile Registry", addr: ADDR.PROFILE_REGISTRY },
  { key: "CREATOR_HUB", label: "Creator Hub", addr: ADDR.CREATOR_HUB },
  { key: "RATINGS", label: "Ratings", addr: ADDR.RATINGS },
  { key: "USDC", label: "USDC", addr: ADDR.USDC },
];

export default function AddressDebug() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold mb-4">Contract Address Health</h1>
      <ul className="space-y-3">
        {ADDRS.map(({ key, label, addr }) => (
          <li key={key} className="border p-3 rounded bg-black/40">
            <div className="font-semibold">{label}</div>
            <div className="font-mono text-sm break-all">{addr || "❌ not set"}</div>
            {addr && (
              <Link
                href={`${EXPLORER}/${addr}`}
                target="_blank"
                className="text-pink-400 underline"
              >
                View on BaseScan ↗
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400">
        Values come from NEXT_PUBLIC_* env vars via <code>lib/addresses.ts</code>.
      </p>
    </div>
  );
}
