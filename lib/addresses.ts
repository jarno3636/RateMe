// /lib/addresses.ts
import { getAddress } from "viem"

// Normalizes & checksums an env address. Returns undefined if empty.
function norm(key: string): `0x${string}` | undefined {
  const raw = process.env[key] as `0x${string}` | undefined
  if (!raw) return undefined
  // Force lowercase first so bad mixed-case checksums don't throw,
  // then return the canonical checksummed address.
  return getAddress(raw.toLowerCase() as `0x${string}`)
}

export const REGISTRY = norm("NEXT_PUBLIC_PROFILE_REGISTRY")
export const HUB       = norm("NEXT_PUBLIC_CREATOR_HUB")
export const RATINGS   = norm("NEXT_PUBLIC_RATINGS")
export const USDC      = norm("NEXT_PUBLIC_USDC") // if you have it
