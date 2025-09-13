// lib/creatorHub.ts
import type { Abi, Address } from 'viem';
import { isAddress } from 'viem';
import { base as BASE } from 'viem/chains';

// Re-export the chain so other files can import { BASE }
export { BASE };

/** Base mainnet id (kept for convenience) */
export const BASE_CHAIN_ID = BASE.id; // 8453

/**
 * Raw env var (set this in Vercel Project → Settings → Environment Variables)
 *   NEXT_PUBLIC_CREATOR_HUB_ADDR = 0xYourCreatorHubAddress
 */
const RAW_HUB = (process.env.NEXT_PUBLIC_CREATOR_HUB_ADDR || '').trim();

/** Helper: non-zero, valid EVM address? */
function isNonZeroAddress(a: string): a is Address {
  return typeof a === 'string'
    && /^0x[0-9a-fA-F]{40}$/.test(a)
    && isAddress(a as Address)
    && !/^0x0{40}$/i.test(a.slice(2));
}

/** True if the env var is set to a valid, non-zero address */
export const HUB_CONFIGURED: boolean = isNonZeroAddress(RAW_HUB);

/**
 * Public constant used by client code. Will be ZERO if not configured.
 * Pair this with a guard in UI (or use HUB_CONFIGURED).
 */
export const CREATOR_HUB_ADDR: Address = HUB_CONFIGURED
  ? (RAW_HUB as Address)
  : ('0x0000000000000000000000000000000000000000' as Address);

/**
 * Server-side helper: get a valid hub address or throw with a clear message.
 * Use in API routes / server code where a missing config should be a hard error.
 */
export function requireHubAddress(): Address {
  if (!HUB_CONFIGURED) {
    throw new Error(
      'CreatorHub address not configured. Set NEXT_PUBLIC_CREATOR_HUB_ADDR to a deployed contract address.'
    );
  }
  return CREATOR_HUB_ADDR;
}

/**
 * Minimal ABI covering the functions used across the app
 */
export const CREATOR_HUB_ABI = [
  // --- views ---
  {
    type: 'function',
    stateMutability: 'view',
    name: 'plans',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'pricePerPeriod', type: 'uint128' },
      { name: 'periodDays', type: 'uint32' },
      { name: 'active', type: 'bool' },
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
    ],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'posts',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'price', type: 'uint128' },
      { name: 'active', type: 'bool' },
      { name: 'accessViaSub', type: 'bool' },
      { name: 'uri', type: 'string' },
    ],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'hasPostAccess',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'postId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'isActive',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'creator', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'getCreatorPlanIds',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'getCreatorPostIds',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },

  // --- writes ---
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'createPlan',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'pricePerPeriod', type: 'uint128' },
      { name: 'periodDays', type: 'uint32' },
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'createPost',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'price', type: 'uint128' },
      { name: 'accessViaSub', type: 'bool' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'payable',
    name: 'subscribe',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'periods', type: 'uint32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    stateMutability: 'payable',
    name: 'buyPost',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },

  // Optional — only if implemented in your contract:
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'cancelSubscription',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [],
  },
] as const satisfies Abi;
