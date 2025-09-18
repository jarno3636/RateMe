// /app/discover/page.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useDiscoverProfiles } from "@/hooks/useDiscoverProfiles";

const PAGE_SIZE = 12n;

// Helpers to tolerate string/bigint shapes coming from the API
const toBig = (v: unknown, d: bigint = 0n) => {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "string" && v.length) return BigInt(v);
    return d;
  } catch {
    return d;
  }
};
const toStr = (v: unknown, d = "") => (typeof v === "string" ? v : d);

function SkeletonCard() {
  return (
    <div className="card animate-pulse" aria-hidden="true" role="status" title="Loading creator">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-white/10" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 h-4 w-2/3 rounded bg-white/10" />
          <div className="h-3 w-1/2 rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function badgeClass(b: string) {
  switch (b) {
    case "verified":
      return "border-blue-400/50 text-blue-200";
    case "pro":
      return "border-amber-400/50 text-amber-200";
    case "top":
      return "border-pink-400/60 text-pink-200";
    case "rising":
      return "border-emerald-400/40 text-emerald-200";
    case "new":
      return "border-purple-400/50 text-purple-200";
    default:
      return "border-white/20 text-white/70";
  }
}

export default function DiscoverPage() {
  const [cursors, setCursors] = useState<bigint[]>([0n]);
  const cursor = cursors[cursors.length - 1];

  const { data: raw, isLoading, isFetching, error } = useDiscoverProfiles(cursor, PAGE_SIZE);

  // Support both shapes:
  //  - old: WireTuple directly
  //  - new: { data: WireTuple, badges: string[][], meta?: ... }
  const wire = (raw as any)?.data ?? raw;
  const badgesAll = ((raw as any)?.badges as string[][] | undefined) ?? [];

  // Wire tuple: [ids, owners, handles, names, avatars, bios, fids, createdAts, nextCursor]
  const idsRaw = (wire?.[0] as unknown[]) ?? [];
  const handles = (wire?.[2] as unknown[]) ?? [];
  const names = (wire?.[3] as unknown[]) ?? [];
  const avatars = (wire?.[4] as unknown[]) ?? [];
  const nextCursor = toBig(wire?.[8], 0n);

  const ids = useMemo(() => idsRaw.map((x) => toBig(x)), [idsRaw]);

  const atEnd = useMemo(() => nextCursor === 0n || nextCursor === cursor, [nextCursor, cursor]);
  const canPrev = cursors.length > 1;

  const goNext = useCallback(() => {
    if (!atEnd) setCursors((prev) => [...prev, nextCursor]);
  }, [atEnd, nextCursor]);

  const goPrev = useCallback(() => {
    if (canPrev) setCursors((prev) => prev.slice(0, prev.length - 1));
  }, [canPrev]);

  const showSkeletons = (isLoading || isFetching) && ids.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Discover creators</h1>

      {error && !isFetching && (
        <div className="card border-red-500/40 text-red-200" role="alert">
          Failed to load creators. Please try again.
        </div>
      )}

      {!error && ids.length === 0 && !isLoading && !isFetching && (
        <div className="card opacity-70">No creators yet. Be the first to create a profile!</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {showSkeletons
          ? Array.from({ length: Number(PAGE_SIZE) }).map((_, i) => <SkeletonCard key={i} />)
          : ids.map((id, i) => {
              const idStr = id.toString();
              const name = toStr(names[i], `Profile #${idStr}`);
              const handle = toStr(handles[i], "");
              const avatar = toStr(avatars[i], "/avatar.png");
              const rowBadges = badgesAll[i] || [];

              return (
                <Link
                  key={idStr}
                  href={`/creator/${idStr}`}
                  className="card transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50"
                  aria-label={`Open ${name} profile`}
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatar || "/avatar.png"}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        if (el.src.endsWith("/avatar.png")) return; // avoid loops
                        el.src = "/avatar.png";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{name}</div>
                      <div className="truncate text-sm opacity-70">
                        {handle ? `@${handle}` : "\u00A0"}
                      </div>
                      {rowBadges.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {rowBadges.map((b) => (
                            <span
                              key={b}
                              className={[
                                "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                                badgeClass(b),
                              ].join(" ")}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="btn"
          onClick={goPrev}
          disabled={!canPrev || isFetching}
          aria-disabled={!canPrev || isFetching}
        >
          Previous
        </button>
        <button
          className="btn"
          onClick={goNext}
          disabled={atEnd || isFetching}
          aria-disabled={atEnd || isFetching}
          title={atEnd ? "No more creators" : ""}
        >
          Next
        </button>
      </div>
    </div>
  );
}
