// lib/profileRegistry/constants.ts
import { getAddress } from 'viem';

/**
 * Small env helpers
 */
const env = (k: string) => process.env[k]?.trim();

/**
 * Chain
 * - Allows override via NEXT_PUBLIC_BASE_CHAIN_ID (or BASE_CHAIN_ID) at build time.
 */
export const BASE_CHAIN_ID: number = (() => {
  const raw = env('NEXT_PUBLIC_BASE_CHAIN_ID') ?? env('BASE_CHAIN_ID');
  const n = raw ? Number(raw) : 8453; // Base mainnet default
  return Number.isFinite(n) ? n : 8453;
})();

/**
 * Addresses
 * - Prefer env overrides; fall back to known mainnet addresses.
 * - Use getAddress() to checksum + validate length.
 * - Expose a ZERO address and a tiny guard.
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function parseAddress(raw?: string, fallback?: `0x${string}`): `0x${string}` {
  try {
    const v = raw ?? fallback ?? ZERO_ADDRESS;
    return getAddress(v as `0x${string}`);
  } catch {
    return ZERO_ADDRESS;
  }
}

/** ProfileRegistry proxy/impl (your deployed address) */
export const REGISTRY_ADDRESS: `0x${string}` = parseAddress(
  env('NEXT_PUBLIC_PROFILE_REGISTRY_ADDR') ?? env('PROFILE_REGISTRY_ADDR'),
  '0x4769667dC49A8E05018729108fD98521F4EbC53a'
);

/** Base USDC (native) – 6 decimals */
export const USDC_ADDRESS: `0x${string}` = parseAddress(
  env('NEXT_PUBLIC_USDC_ADDRESS') ?? env('USDC_ADDRESS'),
  '0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913'
);

/** Handy constant for display math; on-chain reads should still use decimals() */
export const USDC_DECIMALS = 6;

/** Quick guards you can import elsewhere */
export const isZeroAddress = (a?: string) =>
  !a || a.toLowerCase() === ZERO_ADDRESS.toLowerCase();

export const registryConfigured = !isZeroAddress(REGISTRY_ADDRESS);
export const usdcConfigured = !isZeroAddress(USDC_ADDRESS);
