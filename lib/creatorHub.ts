// lib/creatorHub.ts
import type { Address } from 'viem'

// Base mainnet deployment (from your verified contract)
export const CREATOR_HUB = '0x49b9a469d8867e29a4e6810aed4dad724317f606' as Address

// Minimal ABI for reads/writes we use in the app
export const CREATOR_HUB_ABI = [
  // ---- reads ----
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

  // ---- writes ----
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
] as const
