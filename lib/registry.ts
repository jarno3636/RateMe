// lib/registry.ts
import type { Abi, Address } from 'viem';

// Base mainnet (chain id 8453)
export const BASE_CHAIN_ID = 8453;

// USDC on Base (6 decimals)
export const BASE_USDC: Address =
  (process.env.NEXT_PUBLIC_BASE_USDC as Address) ||
  '0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913';

// Your verified ProfileRegistryUSDC
export const PROFILE_REGISTRY_ADDR: Address =
  (process.env.NEXT_PUBLIC_PROFILE_REGISTRY as Address) ||
  '0x4769667dC49A8E05018729108fD98521F4EbC53a';

export const USDC_ABI = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const satisfies Abi;

// Minimal ABI for what we call in the app
export const PROFILE_REGISTRY_ABI = [
  { type: 'function', name: 'feeUnits', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'handleTaken', stateMutability: 'view', inputs: [{ name: 'handle', type: 'string' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'getIdByHandle', stateMutability: 'view', inputs: [{ name: 'handle', type: 'string' }], outputs: [{ type: 'uint256' }] },
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
    outputs: [{ type: 'uint256', name: 'id' }],
  },
] as const satisfies Abi;
