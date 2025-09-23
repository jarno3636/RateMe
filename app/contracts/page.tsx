// /app/contracts/page.tsx
"use client";

import Link from "next/link";
import * as ADDR from "@/lib/addresses";

type AddressLike = `0x${string}`;

type RowProps = {
  label: string;
  addr?: AddressLike;      // ✅ on-chain address type, still optional
  help?: string;
};

function Row({ label, addr, help }: RowProps) {
  const url = ADDR.basescanAddressUrl(addr);
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
  const entries: Array<{ label: string; addr?: AddressLike; help?: string }> = [
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
      label: "Ratings", // ✅ NEW
      addr: ADDR.ADDR.RATINGS,
      help: "On-chain ratings / reviews",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4">
      <h1 className="text-2xl font-semibold">Contract Addresses</h1>

      <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm opacity-80">
        These addresses are sourced from your environment variables. Set them in
        your hosting provider and redeploy.
      </div>

      <section className="space-y-3">
        {entries.map(({ label, addr, help }) => (
          <Row key={label} label={label} addr={addr} help={help} />
        ))}
      </section>

      <div className="pt-4 text-sm opacity-70">
        Ensure these vars are configured:
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li><code>NEXT_PUBLIC_CREATOR_HUB</code></li>
          <li><code>NEXT_PUBLIC_USDC</code></li>
          <li><code>NEXT_PUBLIC_PROFILE_REGISTRY</code></li>
          <li><code>NEXT_PUBLIC_RATINGS</code></li>
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
