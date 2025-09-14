// lib/profileRegistry/constants.ts
import type { Address } from 'viem'
import { getAddress, isAddress, createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

/** Public chain export (Base mainnet) */
export const CHAIN = base
export const BASE_CHAIN_ID = base.id

/** Base native USDC (not bridged) */
export const BASE_USDC: Address = '0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913'

/** Resolve env */
function env(name: string) {
  const v = process.env[name]?.trim()
  return v && v.length > 0 ? v : undefined
}

/** Registry address (checksummed; falls back to zero) */
const RAW =
  env('NEXT_PUBLIC_PROFILE_REGISTRY_ADDR') ||
  env('PROFILE_REGISTRY_ADDR') ||
  ''

export const REGISTRY_ADDRESS: Address = (() => {
  try {
    if (!RAW) throw new Error('missing')
    if (!isAddress(RAW as Address)) throw new Error('invalid')
    return getAddress(RAW) as Address
  } catch {
    // Zero means "not configured"
    return '0x0000000000000000000000000000000000000000'
  }
})()

/** Public RPC (prefer env, fallback to Base) */
const BASE_RPC =
  env('NEXT_PUBLIC_BASE_RPC_URL') ||
  env('BASE_RPC_URL') ||
  'https://mainnet.base.org'

/** Singleton read client */
export const readClient = createPublicClient({
  chain: CHAIN,
  transport: http(BASE_RPC),
})
