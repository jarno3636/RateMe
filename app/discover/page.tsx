"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useListProfiles } from "@/hooks/useProfileRegistry"

export default function DiscoverPage() {
  // keep a stack so we can go back
  const [cursors, setCursors] = useState<bigint[]>([0n])
  const cursor = cursors[cursors.length - 1]

  const { data, isLoading, isFetching } = useListProfiles(cursor, 12n)

  // listProfilesFlat returns:
  // [ids, owners, handles, displayNames, avatarURIs, bios, fids, createdAts, nextCursor]
  const ids      = (data?.[0] as bigint[]) ?? []
  const handles  = (data?.[2] as string[]) ?? []
  const names    = (data?.[3] as string[]) ?? []
  const avatars  = (data?.[4] as string[]) ?? []
  const nextCursor = (data?.[8] as bigint) ?? 0n

  const atEnd = useMemo(() => nextCursor === cursor || nextCursor === 0n, [nextCursor, cursor])
  const canPrev = cursors.length > 1

  const goNext = () => {
    if (atEnd) return
    setCursors((prev) => [...prev, nextCursor])
  }

  const goPrev = () => {
    if (!canPrev) return
    setCursors((prev) => prev.slice(0, prev.length - 1))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Discover creators</h1>

      {(isLoading || isFetching) && (
        <div className="card">Loading…</div>
      )}

      {ids.length === 0 && !isLoading && (
        <div className="card opacity-70">No creators yet. Be the first to create a profile!</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ids.map((id, i) => (
          <Link
            key={id.toString()}
            href={`/creator/${id.toString()}`}
            className="card hover:bg-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatars[i] || "/favicon.ico"}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
            <div className="mt-2 min-w-0">
              <div className="truncate font-medium">
                {names[i] || `Profile #${id.toString()}`}
              </div>
              <div className="truncate text-sm opacity-70">@{handles[i]}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          className="btn"
          onClick={goPrev}
          disabled={!canPrev || isFetching}
          title={canPrev ? "Previous page" : "No previous page"}
        >
          Previous
        </button>
        <button
          className="btn"
          onClick={goNext}
          disabled={atEnd || isFetching}
          title={!atEnd ? "Next page" : "No more results"}
        >
          Next
        </button>
      </div>
    </div>
  )
}
