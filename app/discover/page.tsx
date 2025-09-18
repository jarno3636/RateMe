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
    <div
      className="card animate-pulse"
      aria-hidden="true"
      role="status"
      title="Loading creator"
    >
      <div className="h-14 w-14 rounded-full bg-white/10" />
      <div className="mt-2 w-full">
        <div className="mb-2 h-4 w-2/3 rounded bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-white/10" />
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [cursors, setCursors] = useState<bigint[]>([0n]);
  const cursor = cursors[cursors.length - 1];

  const { data, isLoading, isFetching, error } = useDiscoverProfiles(cursor, PAGE_SIZE);

  // Wire tuple: [ids, owners, handles, names, avatars, bios, fids, createdAts, nextCursor]
  // Your API returns strings for bigints — normalize to tolerate both.
  const idsRaw       = (data?.[0] as unknown[]) ?? [];
  const handles      = (data?.[2] as unknown[]) ?? [];
  const names        = (data?.[3] as unknown[]) ?? [];
  const avatars      = (data?.[4] as unknown[]) ?? [];
  const nextCursor   = toBig(data?.[8], 0n);

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
              const name   = toStr(names[i], `Profile #${idStr}`);
              const handle = toStr(handles[i], "");
              const avatar = toStr(avatars[i], "/avatar.png");

              return (
                <Link
                  key={idStr}
                  href={`/creator/${idStr}`}
                  className="card hover:bg-white/10 transition"
                  aria-label={`Open ${name} profile`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatar || "/avatar.png"}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      if (el.src.endsWith("/avatar.png")) return; // avoid loops
                      el.src = "/avatar.png";
                    }}
                  />
                  <div className="mt-2 min-w-0">
                    <div className="truncate font-medium">{name}</div>
                    <div className="truncate text-sm opacity-70">{handle ? `@${handle}` : "\u00A0"}</div>
                  </div>
                </Link>
              );
            })}
      </div>

      <div className="flex gap-3">
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
