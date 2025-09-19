// /hooks/useDiscoverProfiles.ts
"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type ApiTuple = [
  string[],        // ids
  `0x${string}`[], // owners
  string[],        // handles
  string[],        // displayNames
  string[],        // avatarURIs
  string[],        // bios
  string[],        // fids
  string[],        // createdAts
  string           // nextCursor
]

export type DiscoverTuple = [
  bigint[],
  `0x${string}`[],
  string[],
  string[],
  string[],
  string[],
  bigint[],
  bigint[],
  bigint
]

/** in-memory page cache (per session) */
const cache = new Map<string, DiscoverTuple>()

const toBig = (v: string, d: bigint = 0n) => {
  try { return BigInt(v) } catch { return d }
}

function isApiTuple(x: unknown): x is ApiTuple {
  return Array.isArray(x) && x.length === 9 &&
    Array.isArray(x[0]) && Array.isArray(x[1]) &&
    Array.isArray(x[2]) && Array.isArray(x[3]) &&
    Array.isArray(x[4]) && Array.isArray(x[5]) &&
    Array.isArray(x[6]) && Array.isArray(x[7]) &&
    typeof x[8] === "string"
}

function decodeTuple(d: ApiTuple): DiscoverTuple {
  return [
    d[0].map((x) => toBig(x)),
    d[1],
    d[2],
    d[3],
    d[4],
    d[5],
    d[6].map((x) => toBig(x)),
    d[7].map((x) => toBig(x)),
    toBig(d[8]),
  ]
}

const clamp = (n: bigint, lo: bigint, hi: bigint) => (n < lo ? lo : n > hi ? hi : n)

type State = {
  data?: DiscoverTuple
  isLoading: boolean   // first load for these params
  isFetching: boolean  // any in-flight fetch (including refresh/pagination)
  error: Error | null
}

export function useDiscoverProfiles(cursorIn: bigint, sizeIn: bigint) {
  const cursor = cursorIn < 0n ? 0n : cursorIn
  const size = clamp(sizeIn, 1n, 48n)

  const key = useMemo(
    () => `c:${cursor.toString()}:s:${size.toString()}`,
    [cursor, size]
  )
  const abortRef = useRef<AbortController | null>(null)

  const [state, setState] = useState<State>(() => {
    const cached = cache.get(key)
    return {
      data: cached,
      isLoading: !cached,
      isFetching: false,
      error: null,
    }
  })

  const fetchOnce = async (retry = 0): Promise<void> => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setState((s) => ({ ...s, isFetching: true, error: null }))
    try {
      const r = await fetch(
        `/api/discover?cursor=${cursor.toString()}&size=${size.toString()}`,
        { cache: "no-store", signal: ctrl.signal },
      )
      if (!r.ok) throw new Error(`HTTP ${r.status}`)

      const j = await r.json()
      if (!j || !isApiTuple(j.data)) throw new Error("Malformed discover payload")

      const decoded = decodeTuple(j.data)
      cache.set(key, decoded)

      setState({ data: decoded, isLoading: false, isFetching: false, error: null })
    } catch (e: any) {
      if (ctrl.signal.aborted) return
      if (retry < 1) {
        await new Promise((res) => setTimeout(res, 350))
        return fetchOnce(retry + 1)
      }
      setState((s) => ({
        ...s,
        isLoading: false,
        isFetching: false,
        error: e instanceof Error ? e : new Error(String(e)),
      }))
    }
  }

  useEffect(() => {
    const cached = cache.get(key)
    setState({
      data: cached,
      isLoading: !cached,
      isFetching: false,
      error: null,
    })
    void fetchOnce()
    return () => abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const refresh = () => fetchOnce()

  return {
    data: state.data,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: state.error,
    refresh,
  }
}
