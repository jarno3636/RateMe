// /app/contracts/page.tsx
"use client";

import Link from "next/link";
import { basescanAddressUrl, ADDR } from "@/lib/addresses";

type AddressLike = `0x${string}`;

type RowProps = {
  label: string;
  // ✅ optional, and ALSO explicitly allows undefined when provided
  addr?: AddressLike | undefined;
  help?: string;
};

function Row({ label, addr, help }: RowProps) {
  const url = addr ? basescanAddressUrl(addr) : undefined;

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
            <a
              className="btn-secondary"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              BaseScan
            </a>
          </>
        ) : (
          <span className="text-xs opacity-60">Not configured</span>
        )}
      </div>
    </div>
  );
}

type Entry = { label: string; addr: AddressLike | undefined; help?: string };

export default function ContractsPage() {
  const entries: Entry[] = [
    { label: "Creator Hub",       addr: ADDR.HUB as AddressLike | undefined,      help: "Main contract for posts, plans, and checks" },
    { label: "USDC",              addr: ADDR.USDC as AddressLike | undefined,     help: "Payment token (6 decimals)" },
    { label: "Profile Registry",  addr: ADDR.REGISTRY as AddressLike | undefined, help: "On-chain profile & handle directory" },
    { label: "Ratings",           addr: ADDR.RATINGS as AddressLike | undefined,  help: "On-chain ratings & reviews" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4">
      <h1 className="text-2xl font-semibold">Contract Addresses</h1>

      <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm opacity-80">
        These are pulled from <code>NEXT_PUBLIC_*</code> environment variables.
        Update them in your hosting provider and redeploy.
      </div>

      <section className="space-y-3">
        {entries.map(({ label, addr, help }) => (
          <Row key={label} label={label} addr={addr} help={help} />
        ))}
      </section>

      <div className="pt-4 text-sm opacity-70">
        Ensure these env vars are set:
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li><code>NEXT_PUBLIC_CREATOR_HUB</code></li>
          <li><code>NEXT_PUBLIC_USDC</code></li>
          <li><code>NEXT_PUBLIC_PROFILE_REGISTRY</code></li>
          <li><code>NEXT_PUBLIC_RATINGS</code></li>
        </ul>
      </div>

      <div className="pt-6">
        <Link className="btn" href="/">Back home</Link>
      </div>
    </div>
  );
}
