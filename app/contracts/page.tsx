// /app/contracts/page.tsx
"use client";

import Link from "next/link";
import * as ADDR from "@/lib/addresses";

type AddrKey = "HUB" | "REGISTRY" | "USDC"; // add any others you export as strings

const ENTRIES: Array<{ key: AddrKey; label: string; help?: string }> = [
  { key: "HUB", label: "CreatorHub", help: "Main contracts hub for plans & posts" },
  { key: "REGISTRY", label: "ProfileRegistry", help: "On-chain creator profiles" },
  { key: "USDC", label: "USDC", help: "Payment token (ERC-20)" },
  // add more here if you expose them from addresses.ts
];

function basescanAddressUrl(a: string) {
  return `https://basescan.org/address/${a}`;
}

function Row({
  label,
  addr,
  help,
}: {
  label: string;
  addr?: string | undefined; // <-- explicit union fixes exactOptionalPropertyTypes
  help?: string | undefined;
}) {
  const ok = !!addr && /^0x[a-fA-F0-9]{40}$/.test(addr);
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm opacity-80">{label}</div>
          {help && <div className="text-[11px] opacity-60">{help}</div>}
        </div>
        <div className="flex items-center gap-2">
          {ok ? (
            <>
              <code className="truncate rounded bg-black/50 px-2 py-1 text-xs ring-1 ring-white/10">
                {addr}
              </code>
              <a
                href={basescanAddressUrl(addr!)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                View on BaseScan
              </a>
            </>
          ) : (
            <span className="text-xs text-amber-300/80">Not configured</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <section className="card w-full max-w-2xl mx-auto">
        <h1 className="mb-1 text-2xl font-semibold">Contract Addresses</h1>
        <p className="text-sm opacity-70">
          These are the core addresses used by OnlyStars on Base. If something looks off,
          double-check your environment variables in <code>.env</code>.
        </p>
      </section>

      <section className="space-y-3 w-full max-w-2xl mx-auto">
        {ENTRIES.map(({ label, key, help }) => (
          <Row key={key} label={label} help={help} addr={(ADDR as any)[key] as string | undefined} />
        ))}
      </section>

      <section className="card w-full max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/about" className="btn btn-secondary">
            Learn more
          </Link>
          <a
            href="https://basescan.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            BaseScan
          </a>
        </div>
      </section>
    </div>
  );
}
