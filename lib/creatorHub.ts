// lib/creatorHub.ts
import type { Abi, Address } from 'viem';

/** Base mainnet */
export const BASE_CHAIN_ID = 8453;

/**
 * ✅ Set in Vercel (Project → Settings → Environment Variables):
 *   NEXT_PUBLIC_CREATOR_HUB_ADDR = 0xYourCreatorHubAddress
 */
export const CREATOR_HUB_ADDR: Address =
  (process.env.NEXT_PUBLIC_CREATOR_HUB_ADDR as Address) ??
  '0x0000000000000000000000000000000000000000';

/**
 * Minimal ABI covering the functions used in useCreatorHub()
 * (plans, posts, hasPostAccess, isActive, getCreatorPlanIds, getCreatorPostIds,
 *  createPlan, createPost, subscribe, buyPost)
 *
 * If your contract also exposes cancelSubscription, you can keep that
 * entry below—calling it is optional.
 */
export const CREATOR_HUB_ABI = [
  // --- views used by the hook ---
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

  // --- writes used by the hook ---
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

  // Optional — include only if your contract implements it:
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'cancelSubscription',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [],
  },
] as const satisfies Abi;
