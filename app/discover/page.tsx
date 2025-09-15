// /app/discover/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useListProfiles } from "@/hooks/useProfileRegistry"

export default function DiscoverPage() {
  const [cursor, setCursor] = useState<bigint>(0n)
  const { data, isLoading } = useListProfiles(cursor, 12n)

  const ids = (data?.[0] as bigint[]) ?? []
  const handles = (data?.[2] as string[]) ?? []
  const names = (data?.[3] as string[]) ?? []
  const avatars = (data?.[4] as string[]) ?? []
  const nextCursor = (data?.[9] as bigint) ?? 0n

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Discover creators</h1>

      {isLoading && <div>Loading…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ids.map((id, i) => (
          <Link key={id.toString()} href={`/creator/${id}`} className="card hover:bg-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatars[i] || "/favicon.ico"}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
            <div className="mt-2">
              <div className="font-medium">{names[i] || `Profile #${id}`}</div>
              <div className="text-sm opacity-70">@{handles[i]}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex gap-3">
        <button className="btn" onClick={() => setCursor(nextCursor)}>Next</button>
      </div>
    </div>
  )
}
