// /app/contracts/page.tsx
"use client";

import * as ADDR from "@/lib/addresses";

type Entry = {
  label: string;
  // Limit keys to the address exports you actually use here
  key: "HUB" | "REGISTRY" | "USDC" | "RATINGS";
  help?: string;
};

const ENTRIES: Entry[] = [
  { label: "CreatorHub",       key: "HUB",      help: "Main app contract" },
  { label: "ProfileRegistry",  key: "REGISTRY", help: "Handle → profile mapping" },
  { label: "USDC",             key: "USDC",     help: "Payment token (Base)" },
  { label: "Ratings",          key: "RATINGS",  help: "On-chain ratings & reviews" }, // ✅ added
];

const basescan = (addr?: `0x${string}` | string) =>
  addr ? `https://basescan.org/address/${addr}` : "";

function Row({
  label,
  addr,
  help,
}: {
  label: string;
  addr?: string;
  help?: string;
}) {
  const has = !!addr;

  const copy = async () => {
    if (!has) return;
    await navigator.clipboard.writeText(addr!);
  };

  return (
    <div className="rounded-xl border border-white/10 p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {help ? <div className="text-xs opacity-70">{help}</div> : null}
        <div className="mt-1 text-sm truncate tabular-nums">
          {has ? addr : <span className="opacity-60">Not configured</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="btn-secondary"
          onClick={copy}
          disabled={!has}
          title={has ? "Copy address" : "Missing address"}
        >
          Copy
        </button>
        <a
          className="btn"
          href={has ? basescan(addr) : "#"}
          target={has ? "_blank" : undefined}
          rel={has ? "noopener noreferrer" : undefined}
          aria-disabled={!has}
        >
          View
        </a>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4">
      <header className="card w-full max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold">Contracts</h1>
        <p className="text-white/80">
          Verified addresses used by OnlyStars on <b>Base</b>. These are read from{" "}
          <code className="rounded bg-white/10 px-1 py-0.5">/lib/addresses.ts</code>.
        </p>
      </header>

      {/* Centered list, constrained width */}
      <section className="space-y-3 w-full max-w-2xl mx-auto">
        {ENTRIES.map(({ label, key, help }) => (
          <Row
            key={key}
            label={label}
            help={help}
            // pull named export directly from the module namespace (HUB, REGISTRY, USDC, RATINGS)
            addr={(ADDR as any)[key] as string | undefined}
          />
        ))}
      </section>

      <div className="w-full max-w-2xl mx-auto">
        <a href="/about" className="btn-secondary">Back to About</a>
      </div>
    </div>
  );
}
