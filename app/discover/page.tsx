// /app/discover/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDiscoverProfiles } from "@/hooks/useDiscoverProfiles";

const PAGE_SIZE = 12n;

/* ---------------- helpers ---------------- */
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
const toNum = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

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

function SkeletonCard() {
  return (
    <div
      className="card animate-pulse"
      aria-hidden="true"
      role="status"
      title="Loading creator"
    >
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

function CreatorCard({
  id,
  name,
  handle,
  avatar,
  badges,
}: {
  id: bigint;
  name: string;
  handle: string;
  avatar: string;
  badges: string[];
}) {
  const idStr = id.toString();
  const a = avatar || "/avatar.png";
  return (
    <Link
      href={`/creator/${idStr}`}
      className="card transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50"
      aria-label={`Open ${name} profile`}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-white/10"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (!el.src.endsWith("/avatar.png")) el.src = "/avatar.png";
          }}
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{name}</div>
          <div className="truncate text-sm opacity-70">
            {handle ? `@${handle}` : "\u00A0"}
          </div>
          {badges.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {badges.map((b) => (
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
}

/* ---------------- page ---------------- */
export default function DiscoverPage() {
  /** Cursor stack for bidirectional paging (server returns nextCursor) */
  const [cursors, setCursors] = useState<bigint[]>([0n]);
  const cursor = cursors[cursors.length - 1];

  /** Client-side enhancements */
  const [q, setQ] = useState(""); // search
  const [sort, setSort] = useState<"relevance" | "recent" | "name">("relevance");

  const { data: raw, isLoading, isFetching, error } = useDiscoverProfiles(
    cursor,
    PAGE_SIZE
  );

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
  const createdAts = (wire?.[7] as unknown[]) ?? [];
  const nextCursor = toBig(wire?.[8], 0n);

  // Normalize & clamp to common length to avoid index drift
  const rowCount = Math.min(
    idsRaw.length,
    handles.length,
    names.length,
    avatars.length
  );
  const ids = useMemo(() => idsRaw.slice(0, rowCount).map((x) => toBig(x)), [idsRaw, rowCount]);

  // Derived rows
  const rows = useMemo(() => {
    const out: Array<{
      id: bigint;
      name: string;
      handle: string;
      avatar: string;
      createdAt: number;
      badges: string[];
    }> = [];
    for (let i = 0; i < rowCount; i++) {
      out.push({
        id: toBig(idsRaw[i]),
        name: toStr(names[i], `Profile #${toBig(idsRaw[i]).toString()}`),
        handle: toStr(handles[i], ""),
        avatar: toStr(avatars[i], "/avatar.png"),
        createdAt: toNum(createdAts[i], 0), // seconds since epoch (optional)
        badges: badgesAll[i] || [],
      });
    }
    return out;
  }, [rowCount, idsRaw, names, handles, avatars, createdAts, badgesAll]);

  const atEnd = useMemo(
    () => nextCursor === 0n || nextCursor === cursor,
    [nextCursor, cursor]
  );
  const canPrev = cursors.length > 1;

  const goNext = useCallback(() => {
    if (!atEnd) setCursors((prev) => [...prev, nextCursor]);
  }, [atEnd, nextCursor]);

  const goPrev = useCallback(() => {
    if (canPrev) setCursors((prev) => prev.slice(0, prev.length - 1));
  }, [canPrev]);

  // Client-side filter/sort (non-destructive, pleasant UX)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows;
    if (needle) {
      list = rows.filter((r) => {
        return (
          r.name.toLowerCase().includes(needle) ||
          r.handle.toLowerCase().includes(needle)
        );
      });
    }
    if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "recent") {
      list = [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    // "relevance" keeps API order (e.g., rating/curation order)
    return list;
  }, [rows, q, sort]);

  // Auto-load next page when reaching end of grid
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (atEnd) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            goNext();
          }
        }
      },
      { rootMargin: "240px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [goNext, atEnd, cursor]);

  const showSkeletons = (isLoading || isFetching) && ids.length === 0;

  // Keyboard paging (←/→)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && !atEnd && !isFetching) goNext();
      if (e.key === "ArrowLeft" && canPrev && !isFetching) goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, atEnd, canPrev, isFetching]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Discover creators</h1>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or handle"
              className="w-60 rounded-xl border border-white/15 bg-black/40 px-3 py-2 outline-none focus:ring-2 ring-pink-500/40"
              aria-label="Search creators"
            />
            {q && (
              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs opacity-70 hover:opacity-100"
                onClick={() => setQ("")}
                aria-label="Clear search"
                type="button"
              >
                Clear
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "relevance" | "recent" | "name")
            }
            className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 outline-none focus:ring-2 ring-pink-500/40"
            aria-label="Sort results"
          >
            <option value="relevance">Sort: Featured</option>
            <option value="recent">Sort: Recent</option>
            <option value="name">Sort: A–Z</option>
          </select>
        </div>
      </div>

      {/* Error/empty states */}
      {error && !isFetching && (
        <div
          className="card border-red-500/40 text-red-200"
          role="alert"
          aria-live="polite"
        >
          Failed to load creators. Please try again.
        </div>
      )}

      {!error && ids.length === 0 && !isLoading && !isFetching && (
        <div className="card opacity-70" aria-live="polite">
          No creators yet. Be the first to create a profile!
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {showSkeletons
          ? Array.from({ length: Number(PAGE_SIZE) }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          : filtered.map((r) => (
              <CreatorCard
                key={r.id.toString()}
                id={r.id}
                name={r.name}
                handle={r.handle}
                avatar={r.avatar}
                badges={r.badges}
              />
            ))}
      </div>

      {/* Pager */}
      <div className="flex flex-wrap items-center gap-3">
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
        <span className="text-xs opacity-60" aria-live="polite">
          {isFetching ? "Loading…" : atEnd ? "End of list" : ""}
        </span>
      </div>

      {/* Auto-load sentinel (visible to screen readers only) */}
      {!atEnd && (
        <div
          ref={sentinelRef}
          className="sr-only"
          aria-hidden="false"
          aria-label="Loading more creators"
        />
      )}
    </div>
  );
}
