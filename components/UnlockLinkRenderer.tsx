// /components/UnlockLinkRenderer.tsx
"use client";

import { useEffect, useState } from "react";
import type { LinkUnlockV1 } from "@/types/linkUnlock";

function isProbablyJson(u: string) {
  try { const { pathname } = new URL(u, "http://x"); return /\.json$/i.test(pathname); }
  catch { return false; }
}

function UnlockLinkCard({
  url, unlocked, description, coverUrl,
}: { url: string; unlocked: boolean; description?: string; coverUrl?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="w-full h-40 object-cover" />
      ) : (
        <div className="h-2 w-full bg-gradient-to-r from-pink-500/30 via-fuchsia-400/30 to-violet-400/30" />
      )}
      <div className="p-4">
        <div className="text-lg font-semibold">External Link Unlock</div>
        {description && <div className="text-sm opacity-80 mt-1">{description}</div>}
        <div className="text-xs opacity-60 mt-1 truncate">{url}</div>
        <div className="mt-3">
          {unlocked ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn">Open link</a>
          ) : (
            <div className="text-sm opacity-70">Purchase to unlock this link.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnlockLinkRenderer({
  uri, unlocked,
}: { uri: string; unlocked: boolean }) {
  const [meta, setMeta] = useState<LinkUnlockV1 | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMeta(null); setErr(null);
      if (!isProbablyJson(uri)) return; // non-JSON -> fall back directly
      try {
        const r = await fetch(uri, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as Partial<LinkUnlockV1>;
        if (!cancelled && j && j.kind === "onlystars.linkUnlock@v1" && typeof j.url === "string") {
          setMeta(j as LinkUnlockV1);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load metadata");
      }
    })();
    return () => { cancelled = true; };
  }, [uri]);

  // If no JSON or failed to parse, treat uri as the external link itself.
  const url = meta?.url || uri;
  const description = meta?.description;
  const coverUrl = meta?.coverUrl;

  return <UnlockLinkCard url={url} description={description} coverUrl={coverUrl} unlocked={unlocked} />;
}
