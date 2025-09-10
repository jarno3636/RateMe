// lib/config.ts
import { getAddress } from 'viem';

/** ---------- Env helpers ---------- */
function env(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim().length) return v.trim();
  }
  return undefined;
}

/** ---------- Site / Farcaster ---------- */
const RAW_SITE =
  env('NEXT_PUBLIC_SITE_URL', 'SITE_URL') || 'http://localhost:3000';

export const SITE = RAW_SITE.replace(/\/$/, '');

export const MINIAPP_DOMAIN = (() => {
  try {
    return new URL(SITE).hostname;
  } catch {
    return 'localhost';
  }
})();

/** ---------- Chain / RPC ---------- */
export const BASE_CHAIN_ID = Number(env('NEXT_PUBLIC_BASE_CHAIN_ID') ?? 8453);

// Public RPC first, then server-side fallback, then Base mainnet default
export const BASE_RPC_URL =
  env('NEXT_PUBLIC_BASE_RPC_URL', 'BASE_RPC_URL') || 'https://mainnet.base.org';

/** ---------- Third-party keys ---------- */
export const NEYNAR_API_KEY = env('NEYNAR_API_KEY') || '';

// Handy for RainbowKit / WalletConnect; you provided this id.
export const WALLETCONNECT_PROJECT_ID =
  env('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID') || 'ecdaf8b76c0218e1e571cac6581aa7c4';

/** ---------- Contracts ---------- */
// CreatorHub address (checksummed); configurable via env, with your current default.
const RAW_CREATOR_HUB =
  env('NEXT_PUBLIC_CREATOR_HUB_ADDR', 'CREATOR_HUB_ADDR') ||
  '0x49b9a469d8867e29a4e6810aed4dad724317f606';

export const CREATOR_HUB_ADDR: `0x${string}` = (() => {
  try {
    return getAddress(RAW_CREATOR_HUB);
  } catch {
    // callers should gate against zero address if needed
    return '0x0000000000000000000000000000000000000000';
  }
})();

/** ---------- Misc convenience ---------- */
export const IS_PROD = process.env.NODE_ENV === 'production';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const isConfigured = {
  creatorHub: CREATOR_HUB_ADDR !== ZERO_ADDRESS,
};
