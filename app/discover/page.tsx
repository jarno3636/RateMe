// /app/discover/page.tsx
"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useDiscoverProfiles } from "@/hooks/useDiscoverProfiles"

const PAGE_SIZE = 12n

export default function DiscoverPage() {
  const [cursors, setCursors] = useState<bigint[]>([0n])
  const cursor = cursors[cursors.length - 1]

  const { data, isLoading, isFetching, error } = useDiscoverProfiles(cursor, PAGE_SIZE)

  const ids       = (data?.[0] as bigint[]) ?? []
  const handles   = (data?.[2] as string[]) ?? []
  const names     = (data?.[3] as string[]) ?? []
  const avatars   = (data?.[4] as string[]) ?? []
  const nextCursor = (data?.[8] as bigint) ?? 0n

  const atEnd = useMemo(() => nextCursor === 0n || nextCursor === cursor, [nextCursor, cursor])
  const canPrev = cursors.length > 1

  const goNext = useCallback(() => {
    if (!atEnd) setCursors((prev) => [...prev, nextCursor])
  }, [atEnd, nextCursor])

  const goPrev = useCallback(() => {
    if (canPrev) setCursors((prev) => prev.slice(0, prev.length - 1))
  }, [canPrev])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Discover creators</h1>

      {(isLoading || isFetching) && <div className="card">Loading…</div>}

      {error && !isFetching && (
        <div className="card border-red-500/40 text-red-200">
          Failed to load creators. Please try again.
        </div>
      )}

      {ids.length === 0 && !isLoading && !isFetching && !error && (
        <div className="card opacity-70">No creators yet. Be the first to create a profile!</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ids.map((id, i) => {
          const idStr = id.toString()
          const name = names[i] || `Profile #${idStr}`
          const handle = handles[i] || ""
          const avatar = avatars[i] || "/favicon.ico"
          return (
            <Link
              key={idStr}
              href={`/creator/${idStr}`}
              className="card hover:bg-white/10"
              aria-label={`Open ${name} profile`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/favicon.ico" }}
                loading="lazy"
              />
              <div className="mt-2 min-w-0">
                <div className="truncate font-medium">{name}</div>
                <div className="truncate text-sm opacity-70">@{handle}</div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button className="btn" onClick={goPrev} disabled={!canPrev || isFetching}>Previous</button>
        <button className="btn" onClick={goNext} disabled={atEnd || isFetching}>Next</button>
      </div>
    </div>
  )
}
