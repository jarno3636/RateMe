// lib/neynar.ts
import 'server-only';
import { NEYNAR_API_KEY } from './config';
import { normalizeHandle, isValidHandle } from './handles';

/** Minimal user shape we care about across the app */
export type NeynarUser = {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  bio?: { text?: string };
};

type NeynarUserByUsernameResp = {
  result?: { user?: any };
};

type NeynarUserByFidResp = {
  result?: { user?: any };
};

const NEYNAR_BASE = 'https://api.neynar.com/v2/farcaster';
const TIMEOUT_MS = 10_000;

/** Internal: thin fetch wrapper with timeout, stable headers, and a single retry on 429/5xx */
async function neynarFetch<T = unknown>(url: string): Promise<T | null> {
  if (!NEYNAR_API_KEY) {
    // Missing key — keep behavior non-fatal, but make it obvious in logs.
    console.warn('NEYNAR_API_KEY not set; returning null for', url);
    return null;
  }

  const attempt = async (signal: AbortSignal) => {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-api-key': NEYNAR_API_KEY, // v2 prefers this
        api_key: NEYNAR_API_KEY,     // still accepted; harmless duplicate
      },
      cache: 'no-store',
      signal,
    });

    // happy path
    if (res.ok) return (await res.json()) as T;

    // soft-fail: log and return null (don’t 500 your routes)
    console.error('Neynar HTTP', res.status, url);
    // trigger retry on rate-limit or generic server errors
    if (res.status === 429 || res.status >= 500) throw new Error(String(res.status));
    return null;
  };

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    try {
      return await attempt(controller.signal);
    } catch (e) {
      // simple, bounded retry with small backoff
      await new Promise((r) => setTimeout(r, 400));
      return await attempt(controller.signal);
    }
  } catch (err) {
    console.error('Neynar fetch error:', err);
    return null;
  } finally {
    clearTimeout(to);
  }
}

/** Map the Neynar v2 response shape -> NeynarUser */
function mapUser(u: any): NeynarUser | null {
  if (!u || typeof u !== 'object') return null;
  return {
    fid: u.fid,
    username: u.username,
    display_name: u.display_name,
    pfp_url: u.pfp_url,
    bio: { text: u.profile?.bio?.text },
  };
}

/**
 * Fetch a Farcaster user by username/handle.
 * Returns `null` on any error (keeps API routes resilient).
 */
export async function fetchNeynarUserByHandle(handle: string): Promise<NeynarUser | null> {
  const h = normalizeHandle(handle);
  // Align validation to your contract-compatible rules (3..32, [a-z0-9._-])
  if (!isValidHandle(h)) return null;

  const url = `${NEYNAR_BASE}/user-by-username?username=${encodeURIComponent(h)}`;
  const data = await neynarFetch<NeynarUserByUsernameResp>(url);
  const user = data?.result?.user;
  return mapUser(user);
}

/** Fetch by FID (handy if you store fid in your registry/KV) */
export async function fetchNeynarUserByFid(fid: number): Promise<NeynarUser | null> {
  if (!Number.isFinite(fid)) return null;
  const url = `${NEYNAR_BASE}/user?fid=${fid}`;
  const data = await neynarFetch<NeynarUserByFidResp>(url);
  const user = data?.result?.user;
  return mapUser(user);
}

/**
 * Small convenience: fetch multiple users by handle (sequential with caching at Neynar-side).
 * Designed for short lists used in grids; returns only successful lookups.
 */
export async function fetchNeynarUsersByHandles(handles: string[]): Promise<NeynarUser[]> {
  const unique = Array.from(
    new Set(
      handles
        .map((h) => normalizeHandle(h))
        .filter((h) => isValidHandle(h))
    )
  );

  const results: NeynarUser[] = [];
  for (const h of unique) {
    const u = await fetchNeynarUserByHandle(h);
    if (u) results.push(u);
  }
  return results;
}

/** Helper to derive a nice display name with fallbacks (use in UI) */
export function displayName(u?: NeynarUser | null): string {
  if (!u) return '';
  return u.display_name?.trim() || u.username;
}

/** Fallback avatar if Neynar has none or fails */
export function avatarUrl(u?: NeynarUser | null): string {
  return u?.pfp_url || '/icon-192.png';
}
