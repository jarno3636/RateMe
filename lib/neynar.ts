// lib/neynar.ts
import { NEYNAR_API_KEY } from './config'

/** Minimal user shape we care about across the app */
export type NeynarUser = {
  fid: number
  username: string
  display_name?: string
  pfp_url?: string
  bio?: { text?: string }
}

/** Small utility to normalize incoming @handles */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase()
}

/** Basic validation for farcaster handles (alnum, underscores, dots, hyphens) */
export function isValidHandle(h: string): boolean {
  return /^[a-z0-9._-]{1,32}$/i.test(normalizeHandle(h))
}

/** Internal: thin fetch wrapper with timeout + stable headers */
async function neynarFetch<T = unknown>(url: string): Promise<T | null> {
  if (!NEYNAR_API_KEY) return null

  const controller = new AbortController()
  const to = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        // Neynar v2 accepts either `api_key` or `x-api-key`; keeping both for safety.
        'api_key': NEYNAR_API_KEY,
        'x-api-key': NEYNAR_API_KEY,
      },
      // We want fresh data when creating accounts; avoid caching at the edge.
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!res.ok) {
      // Don’t throw (prevents API route 500s); log to help debugging in Vercel logs
      console.error('Neynar HTTP', res.status, url)
      return null
    }

    const data = (await res.json()) as T
    return data
  } catch (err) {
    console.error('Neynar fetch error:', err)
    return null
  } finally {
    clearTimeout(to)
  }
}

/** Map the Neynar v2 response shape -> NeynarUser */
function mapUser(u: any): NeynarUser | null {
  if (!u || typeof u !== 'object') return null
  return {
    fid: u.fid,
    username: u.username,
    display_name: u.display_name,
    pfp_url: u.pfp_url,
    bio: { text: u.profile?.bio?.text },
  }
}

/**
 * Fetch a Farcaster user by username/handle.
 * Returns `null` on any error (don’t 500 your routes).
 */
export async function fetchNeynarUserByHandle(handle: string): Promise<NeynarUser | null> {
  const h = normalizeHandle(handle)
  if (!isValidHandle(h)) return null

  const url = `https://api.neynar.com/v2/farcaster/user-by-username?username=${encodeURIComponent(
    h,
  )}`
  const data = await neynarFetch<any>(url)
  const user = data?.result?.user
  return mapUser(user)
}

/** Optional: fetch by FID (useful if you store fid) */
export async function fetchNeynarUserByFid(fid: number): Promise<NeynarUser | null> {
  if (!Number.isFinite(fid)) return null
  const url = `https://api.neynar.com/v2/farcaster/user?fid=${fid}`
  const data = await neynarFetch<any>(url)
  const user = data?.result?.user
  return mapUser(user)
}

/**
 * Helper to derive a nice display name with fallbacks
 * (use on UI so you don’t scatter nullish coalescing everywhere)
 */
export function displayName(u?: NeynarUser | null): string {
  if (!u) return ''
  return u.display_name?.trim() || u.username
}

/** Fallback avatar if Neynar has none or fails */
export function avatarUrl(u?: NeynarUser | null): string {
  return u?.pfp_url || '/icon-192.png'
}
