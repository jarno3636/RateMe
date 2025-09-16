// /hooks/useDiscoverProfiles.ts
"use client"

import { useEffect, useState } from "react"

type ApiTuple = [
  string[],        // ids (as strings)
  `0x${string}`[], // owners
  string[],        // handles
  string[],        // displayNames
  string[],        // avatarURIs
  string[],        // bios
  string[],        // fids (as strings)
  string[],        // createdAts (as strings)
  string           // nextCursor (as string)
]

// same tuple shape as on-chain, but with real bigints on the bigint fields
export type DiscoverTuple = [
  bigint[],        // ids
  `0x${string}`[], // owners
  string[],        // handles
  string[],        // displayNames
  string[],        // avatarURIs
  string[],        // bios
  bigint[],        // fids
  bigint[],        // createdAts
  bigint           // nextCursor
]

export function useDiscoverProfiles(cursor: bigint, size: bigint) {
  const [data, setData] = useState<DiscoverTuple | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let ignore = false
    setIsLoading(true) // reset on new params

    const run = async () => {
      setIsFetching(true)
      try {
        const r = await fetch(
          `/api/discover?cursor=${cursor.toString()}&size=${size.toString()}`,
          { cache: "no-store" },
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)

        const j = (await r.json()) as { data?: ApiTuple }
        if (!j?.data) throw new Error("Malformed discover payload")

        const d = j.data
        const decoded: DiscoverTuple = [
          d[0].map((x) => BigInt(x)),
          d[1],
          d[2],
          d[3],
          d[4],
          d[5],
          d[6].map((x) => BigInt(x)),
          d[7].map((x) => BigInt(x)),
          BigInt(d[8]),
        ]

        if (!ignore) {
          setData(decoded)
          setError(null)
        }
      } catch (e: any) {
        if (!ignore) {
          setError(e instanceof Error ? e : new Error(String(e)))
          setData(undefined)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
          setIsFetching(false)
        }
      }
    }

    run()
    return () => {
      ignore = true
    }
  }, [cursor, size])

  return { data, isLoading, isFetching, error }
}
