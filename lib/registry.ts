// lib/registry.ts
import { getAddress, isAddress, type Address } from 'viem';
import { base as BASE } from 'viem/chains';

/** Chain exports (both names for convenience/back-compat) */
export { BASE };
export const CHAIN = BASE;
export const BASE_CHAIN_ID = BASE.id;

/* ----------------------------- env helpers ------------------------------ */
function env(name: string) {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : undefined;
}

function isNonZeroAddress(a?: string): a is Address {
  return !!a && /^0x[0-9a-fA-F]{40}$/.test(a) && isAddress(a as Address) && !/^0x0{40}$/i.test(a.slice(2));
}

/* ---------------------- Profile Registry address ------------------------ */
/**
 * Prefer public var so the client can read it:
 *   NEXT_PUBLIC_PROFILE_REGISTRY_ADDR
 * Fallback to server var:
 *   PROFILE_REGISTRY_ADDR
 */
const RAW_PROFILE_REGISTRY =
  env('NEXT_PUBLIC_PROFILE_REGISTRY_ADDR') || env('PROFILE_REGISTRY_ADDR');

/** Checksummed (if valid) or zero address if missing/invalid */
export const PROFILE_REGISTRY_ADDR: Address = (() => {
  try {
    if (!RAW_PROFILE_REGISTRY || !isNonZeroAddress(RAW_PROFILE_REGISTRY)) {
      throw new Error('missing/zero');
    }
    return getAddress(RAW_PROFILE_REGISTRY) as Address; // checksums
  } catch {
    return '0x0000000000000000000000000000000000000000' as Address;
  }
})();

/** Is the registry configured to a non-zero address? */
export const REGISTRY_CONFIGURED = isNonZeroAddress(RAW_PROFILE_REGISTRY);

/** Server-side convenience: throw a clear error if misconfigured */
export function requireProfileRegistryAddress(): Address {
  if (!REGISTRY_CONFIGURED) {
    throw new Error(
      'PROFILE_REGISTRY_ADDR not configured. ' +
        'Set NEXT_PUBLIC_PROFILE_REGISTRY_ADDR (or PROFILE_REGISTRY_ADDR) to your deployed ProfileRegistry address.'
    );
  }
  return PROFILE_REGISTRY_ADDR;
}

/* ------------------------------- USDC ----------------------------------- */
/** Base USDC (native). Override via env later if you need a different token. */
export const BASE_USDC: Address = '0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913';

/** Minimal ERC-20 ABI (allowance/approve) — exported as USDC_ABI for existing imports */
export const USDC_ABI = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

/* ------------------------ Profile Registry ABI -------------------------- */
/**
 * Matches usage:
 *  - handleTaken(string) -> bool
 *  - feeUnits() -> uint256
 *  - getIdByHandle(string) -> uint256
 *  - createProfile(string handle, string displayName, string avatarURI, string bio, uint256 fid) -> uint256 id
 */
export const PROFILE_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'handleTaken',
    stateMutability: 'view',
    inputs: [{ name: 'handle', type: 'string' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'feeUnits',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getIdByHandle',
    stateMutability: 'view',
    inputs: [{ name: 'handle', type: 'string' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'createProfile',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'handle', type: 'string' },
      { name: 'displayName', type: 'string' },
      { name: 'avatarURI', type: 'string' },
      { name: 'bio', type: 'string' },
      { name: 'fid', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;
