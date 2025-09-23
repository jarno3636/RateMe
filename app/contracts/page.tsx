"use client";

import * as ADDR from "@/lib/addresses";

type Entry = {
  label: string;
  key: "HUB" | "REGISTRY" | "USDC" | "RATINGS";
  help?: string;
};

const ENTRIES: Entry[] = [
  { label: "CreatorHub",      key: "HUB",      help: "Main app contract" },
  { label: "ProfileRegistry", key: "REGISTRY", help: "Handle → profile mapping" },
  { label: "USDC",            key: "USDC",     help: "Payment token (Base)" },
  { label: "Ratings",         key: "RATINGS",  help: "On-chain ratings & reviews" },
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
    <div className="rounded-xl border border-white/10 p-4 flex items-center justify-between gap-3 bg-black/40 hover:border-pink-500/50 transition-colors">
      <div className="min-w-0">
        <div className="font-medium text-pink-400">{label}</div>
        {help ? <div className="text-xs text-white/70">{help}</div> : null}
        <div className="mt-1 text-sm truncate tabular-nums">
          {has ? (
            <span className="text-white/90">{addr}</span>
          ) : (
            <span className="opacity-60">Not configured</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="btn-secondary hover:border-pink-400 hover:text-pink-400"
          onClick={copy}
          disabled={!has}
          title={has ? "Copy address" : "Missing address"}
        >
          Copy
        </button>
        <a
          className="btn hover:border-pink-400 hover:text-pink-400"
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
    <div className="mx-auto max-w-3xl space-y-8 px-4">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">
          <span className="text-pink-400">Contracts</span>
        </h1>
        <p className="text-white/80">
          Verified addresses used by OnlyStars on{" "}
          <b className="text-pink-400">Base</b>.
        </p>
      </header>

      <section className="space-y-4 w-full max-w-2xl mx-auto">
        {ENTRIES.map(({ label, key, help }) => {
          const addr = (ADDR as any)[key] as string | undefined;
          return (
            <Row
              key={key}
              label={label}
              {...(help ? { help } : {})}
              {...(addr ? { addr } : {})}
            />
          );
        })}
      </section>

      <div className="w-full max-w-2xl mx-auto text-center">
        <a
          href="/about"
          className="btn-secondary hover:border-pink-400 hover:text-pink-400"
        >
          Back to About
        </a>
      </div>
    </div>
  );
}
