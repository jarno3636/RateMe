// lib/api/creator.ts

export type Availability = {
  ok: boolean;
  /** syntactic validity of the handle (length + charset) */
  valid: boolean;
  /** present in KV already */
  existsKV: boolean;
  /** handle already taken on-chain (registry) */
  onchainTaken: boolean;
  /** convenience flag: valid && !existsKV && !onchainTaken */
  available: boolean;
  error?: string;
};

export type RegisterCreatorBody = {
  handle: string;
  address?: `0x${string}` | null;
  fid?: number;
};

export type CreatorMinimal = {
  id: string;
  handle: string;
  address?: `0x${string}` | null;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  fid?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type RegisterCreatorResp =
  | { ok: true; creator: CreatorMinimal }
  | { ok: false; error: string };

/* --------------------------- helpers --------------------------- */

function normalizeHandleId(s: string) {
  return String(s || '').trim().replace(/^@+/, '').toLowerCase();
}

function isHandleSyntaxOK(h: string) {
  return !!h && h.length >= 3 && h.length <= 32 && /^[a-z0-9._-]+$/.test(h);
}

async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: T | null }> {
  const res = await fetch(url, {
    headers: { accept: 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
    ...init,
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

/**
 * Check if a handle is available (KV + on-chain registry).
 * Uses GET /api/creator/register?handle=...
 * Expected response shape:
 *   { ok: true, exists: boolean, onchainTaken: boolean, creator?: {...} }
 */
export async function checkHandleAvailability(raw: string): Promise<Availability> {
  const handleId = normalizeHandleId(raw);
  const valid = isHandleSyntaxOK(handleId);

  if (!valid) {
    return {
      ok: true,
      valid,
      existsKV: false,
      onchainTaken: false,
      available: false,
    };
  }

  try {
    const { ok, status, json } = await apiFetch(`/api/creator/register?handle=${encodeURIComponent(handleId)}`);
    if (!ok || !json) {
      return {
        ok: false,
        valid,
        existsKV: false,
        onchainTaken: false,
        available: false,
        error: (json as any)?.error || `check failed (${status})`,
      };
    }

    // The GET route returns "exists" (KV) and "onchainTaken" (registry)
    const existsKV = !!(json as any).exists;
    const onchainTaken = !!(json as any).onchainTaken;

    return {
      ok: true,
      valid,
      existsKV,
      onchainTaken,
      available: valid && !existsKV && !onchainTaken,
    };
  } catch (e: any) {
    return {
      ok: false,
      valid,
      existsKV: false,
      onchainTaken: false,
      available: false,
      error: e?.message || 'network error',
    };
  }
}

/**
 * Register a new creator by calling the POST API route.
 * Server validates, hydrates from Neynar (best-effort), and writes to KV.
 *
 * Expected success response:
 *   { ok: true, creator: {...} }
 *
 * Common errors:
 *   400 Bad request (validation)
 *   409 Handle already registered (KV or on-chain)
 */
export async function registerCreator(input: RegisterCreatorBody): Promise<RegisterCreatorResp> {
  try {
    const handleId = normalizeHandleId(input.handle);
    if (!isHandleSyntaxOK(handleId)) {
      return { ok: false, error: 'Invalid handle' };
    }

    // Compose explicit payload; avoid spreading unknown keys.
    const payload: RegisterCreatorBody = {
      handle: handleId,
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.fid !== undefined ? { fid: input.fid } : {}),
    };

    const { ok, status, json } = await apiFetch('/api/creator/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!ok || !json) {
      return { ok: false, error: (json as any)?.error || `register failed (${status})` };
    }

    return { ok: true, creator: (json as any).creator as CreatorMinimal };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network error' };
  }
}
