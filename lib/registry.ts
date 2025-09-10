// lib/registry.ts
import { getAddress } from 'viem'
import { base } from 'viem/chains'

// ── chain (exported if other code needs it)
export const CHAIN = base

// ── helpers
function env(name: string) {
  const v = process.env[name]?.trim()
  return v && v.length > 0 ? v : undefined
}

// Normalize & checksum the registry address.
// If it’s missing or invalid, we fall back to zero address (and gate calls later).
const RAW_PROFILE_REGISTRY = env('NEXT_PUBLIC_PROFILE_REGISTRY_ADDR') || env('PROFILE_REGISTRY_ADDR')

export const PROFILE_REGISTRY_ADDR: `0x${string}` = (() => {
  try {
    if (!RAW_PROFILE_REGISTRY) throw new Error('missing')
    return getAddress(RAW_PROFILE_REGISTRY) // checksums & validates length
  } catch {
    // Leave a safe default; callers should guard against zero address.
    return '0x0000000000000000000000000000000000000000'
  }
})()

// Common tokens
export const BASE_USDC = ((): `0x${string}` => {
  // Base USDC (native) — replace if you’re using a different one
  return '0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913' // checksummed
})()

// ABIs (trimmed for brevity)
export const PROFILE_REGISTRY_ABI = [
  // Only the pieces you actually call
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
    name: 'createProfile',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'handle', type: 'string' }],
    outputs: [{ type: 'uint256' }],
  },
] as const
