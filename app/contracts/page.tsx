// /app/contracts/page.tsx
"use client";

import Link from "next/link";
import * as ADDR from "@/lib/addresses";

type RowProps = {
  label: string;
  addr?: string;
  help?: string;
};

function Row({ label, addr, help }: RowProps) {
  const url = addr ? ADDR.basescanAddressUrl(addr as `0x${string}`) : undefined;
  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {help && <div className="text-xs opacity-70">{help}</div>}
      </div>
      <div className="flex items-center gap-2">
        {addr ? (
          <>
            <code className="rounded bg-white/5 px-2 py-1 text-xs">{addr}</code>
            {url && (
              <a
                className="btn-secondary"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                BaseScan
              </a>
            )}
          </>
        ) : (
          <span className="text-xs opacity-60">Not configured</span>
        )}
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const entries: Array<{ label: string; addr?: string; help?: string }> = [
    {
      label: "Creator Hub",
      addr: ADDR.ADDR.HUB,
      help: "Main contract for posts, plans, and checks",
    },
    {
      label: "USDC",
      addr: ADDR.ADDR.USDC,
      help: "Payment token (6 decimals)",
    },
    {
      label: "Profile Registry",
      addr: ADDR.ADDR.REGISTRY,
      help: "Handles profile data on-chain",
    },
    {
      label: "Ratings",
      addr: ADDR.ADDR.RATINGS, // ✅ NEW
      help: "On-chain ratings/reviews contract",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4">
      <h1 className="text-2xl font-semibold">Contract Addresses</h1>

      <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm opacity-80">
        Environment-driven. Configure via{" "}
        <code className="rounded bg-white/5 px-1">NEXT_PUBLIC_*</code> vars in
        your deployment settings.
      </div>

      <section className="space-y-3">
        {entries.map(({ label, addr, help }) => (
          // ✅ Only pass `addr` prop if it’s defined (fixes the TS error)
          <Row key={label} label={label} help={help} {...(addr ? { addr } : {})} />
        ))}
      </section>

      <div className="pt-4 text-sm opacity-70">
        Don’t see an address? Make sure you set the corresponding environment
        variable in your hosting provider and redeploy:
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <code>NEXT_PUBLIC_CREATOR_HUB</code>
          </li>
          <li>
            <code>NEXT_PUBLIC_USDC</code>
          </li>
          <li>
            <code>NEXT_PUBLIC_PROFILE_REGISTRY</code>
          </li>
          <li>
            <code>NEXT_PUBLIC_RATINGS</code> {/* ✅ NEW */}
          </li>
        </ul>
      </div>

      <div className="pt-6">
        <Link className="btn" href="/">
          Back home
        </Link>
      </div>
    </div>
  );
}
