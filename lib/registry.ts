// lib/registry.ts
import { getAddress } from 'viem'
import { base } from 'viem/chains'

/** Chain exports */
export const CHAIN = base
export const BASE_CHAIN_ID = base.id

/** Helpers */
function env(name: string) {
  const v = process.env[name]?.trim()
  return v && v.length > 0 ? v : undefined
}

/** Profile Registry address (checksummed or zero if missing/invalid) */
const RAW_PROFILE_REGISTRY =
  env('NEXT_PUBLIC_PROFILE_REGISTRY_ADDR') || env('PROFILE_REGISTRY_ADDR')

export const PROFILE_REGISTRY_ADDR: `0x${string}` = (() => {
  try {
    if (!RAW_PROFILE_REGISTRY) throw new Error('missing')
    return getAddress(RAW_PROFILE_REGISTRY) // checksums & validates
  } catch {
    // Callers should gate against zero address.
    return '0x0000000000000000000000000000000000000000'
  }
})()

/** Base USDC (native, not bridged). Override if needed via env later. */
export const BASE_USDC: `0x${string}` = '0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913'

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
] as const

/**
 * Profile Registry ABI
 * Matches usage in hooks/lib:
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
] as const
