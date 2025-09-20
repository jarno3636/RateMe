// /lib/getTop3Ids.ts (client-safe)
/**
 * Fetch the current Top 3 profile IDs from our API.
 * - Client-safe (uses window.fetch when available)
 * - No throwing — always returns an array (possibly empty)
 * - Opts: allow overriding path or passing an AbortSignal
 */

export type GetTop3Options = {
  /** Defaults to "/api/top3" */
  path?: string
  /** Pass through an AbortSignal to cancel (allow null for strict RequestInit typing) */
  signal?: AbortSignal | null
}

export async function getTop3Ids(opts: GetTop3Options = {}): Promise<number[]> {
  const path = opts.path ?? "/api/top3"
  try {
    const res = await fetch(path, {
      cache: "no-store",
      // With exactOptionalPropertyTypes, RequestInit.signal is AbortSignal | null
      signal: opts.signal ?? null,
    })
    if (!res.ok) return []
    const json = await res.json().catch(() => ({}))
    const raw = Array.isArray((json as any)?.ids) ? (json as any).ids : []
    return raw
      .map((x: unknown) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)
  } catch {
    return []
  }
}

export default getTop3Ids
