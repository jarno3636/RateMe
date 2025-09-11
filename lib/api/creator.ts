// lib/api/creator.ts

export type Availability = {
  ok: boolean;
  valid: boolean;
  existsKV: boolean;
  onchainTaken: boolean;
  available: boolean;
  error?: string;
};

export type RegisterCreatorBody = {
  handle: string;
  address?: `0x${string}` | null;
  fid?: number;
};

export type RegisterCreatorResp =
  | { ok: true; creator: { id: string; handle: string } }
  | { ok: false; error: string };

/* --------------------------- helpers --------------------------- */

function normalizeHandleId(s: string) {
  return String(s || '').trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Check if a handle is available (KV + onchain check).
 */
export async function checkHandleAvailability(raw: string): Promise<Availability> {
  const handleId = normalizeHandleId(raw);
  const valid =
    !!handleId &&
    handleId.length >= 3 &&
    handleId.length <= 32 &&
    /^[a-z0-9._-]+$/.test(handleId);

  if (!valid) {
    return {
      ok: true,
      valid: false,
      existsKV: false,
      onchainTaken: false,
      available: false,
    };
  }

  try {
    const res = await fetch(`/api/creator/register?handle=${encodeURIComponent(handleId)}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    const j = await res.json().catch(() => null);

    if (!res.ok || !j) {
      return {
        ok: false,
        valid,
        existsKV: false,
        onchainTaken: false,
        available: false,
        error: j?.error || `check failed (${res.status})`,
      };
    }

    const existsKV = !!j.exists;
    const onchainTaken = !!j.onchainTaken;

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
 * Will hydrate from Neynar and write to KV on the server.
 *
 * Note: We avoid destructuring `{ handle }` in the signature to prevent any
 * accidental bundler hoisting of a top-level `handle` binding.
 */
export async function registerCreator(input: RegisterCreatorBody): Promise<RegisterCreatorResp> {
  try {
    const handleId = normalizeHandleId(input.handle);

    // Compose an explicit payload so we never spread unexpected keys.
    const payload: RegisterCreatorBody = {
      handle: handleId,
      // Preserve optional fields (null is allowed for address)
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.fid !== undefined ? { fid: input.fid } : {}),
    };

    const res = await fetch('/api/creator/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    const j = await res.json().catch(() => null);

    if (!res.ok || !j) {
      return { ok: false, error: j?.error || `register failed (${res.status})` };
    }

    return { ok: true, creator: j.creator };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network error' };
  }
}
