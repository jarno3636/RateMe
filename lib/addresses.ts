// /lib/addresses.ts
import { getAddress } from "viem";

/** Base mainnet chain id (update if you deploy elsewhere) */
export const CHAIN_ID = 8453; // matches viem's `base.id`

/**
 * Normalize & checksum an env address.
 * - Returns `undefined` if empty or invalid (no hard crash).
 * - Logs a one-time warning when invalid/missing.
 */
function norm(key: string): `0x${string}` | undefined {
  const raw = process.env[key] as `0x${string}` | undefined;
  if (!raw) {
    warnOnce(`[addresses] ${key} is not set`);
    return undefined;
  }
  try {
    // Lowercase first so bad mixed-case won't throw; viem will re-checksum.
    return getAddress(raw.toLowerCase() as `0x${string}`);
  } catch {
    warnOnce(`[addresses] ${key} is invalid: ${raw}`);
    return undefined;
  }
}

// one-time logger (avoids spam during HMR/SSR re-renders)
const _warned = new Set<string>();
function warnOnce(msg: string) {
  if (_warned.has(msg)) return;
  _warned.add(msg);
  console.warn(msg);
}

// Canonical exports
export const REGISTRY = norm("NEXT_PUBLIC_PROFILE_REGISTRY");
export const HUB      = norm("NEXT_PUBLIC_CREATOR_HUB");
export const RATINGS  = norm("NEXT_PUBLIC_RATINGS");
export const USDC     = norm("NEXT_PUBLIC_USDC"); // optional

// Aliases to satisfy older imports
export const PROFILE_REGISTRY = REGISTRY;
export const CREATOR_HUB      = HUB;

/**
 * Optional helper: call this inside actions/API routes *before* doing writes.
 * It throws with a friendly message instead of failing deep in a hook.
 */
export function assertAddresses(...keys: Array<"REGISTRY"|"HUB"|"RATINGS"|"USDC">) {
  for (const k of keys) {
    const v = { REGISTRY, HUB, RATINGS, USDC }[k];
    if (!v) throw new Error(`[addresses] Missing required address: ${k}. Check your NEXT_PUBLIC_* env vars.`);
  }
}
