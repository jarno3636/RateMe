// /lib/addresses.ts
import { getAddress } from "viem"
import { base } from "viem/chains"

/**
 * Centralized, safe address/config accessors.
 * - Works on server & client (NEXT_PUBLIC_* is inlined at build time).
 * - Never throws during import. Use assert* helpers when you need hard guarantees.
 * - Normalizes to EIP-55 checksummed 0x addresses.
 */

/** Deployed chain (update if you deploy elsewhere) */
export const CHAIN = base
export const CHAIN_ID = CHAIN.id // 8453

/** Optional RPC / Explorer (can be overridden by env) */
export const RPC_URL =
  (process.env.NEXT_PUBLIC_BASE_RPC_URL || "").trim() || undefined

/** Prefer env override, fall back to official basescan */
export const BASESCAN_URL =
  (process.env.NEXT_PUBLIC_BASESCAN_URL || "https://basescan.org").replace(/\/+$/, "")

/** Validates and normalizes an env address (returns undefined if missing/invalid). */
function normEnvAddress(key: string): `0x${string}` | undefined {
  const raw = (process.env as Record<string, string | undefined>)[key]?.trim()
  if (!raw) {
    warnOnce(`[addresses] ${key} is not set`)
    return undefined
  }
  // treat "0x000...0" as unset; many teams use it as a placeholder
  if (/^0x0+$/.test(raw)) {
    warnOnce(`[addresses] ${key} is zero address (treated as unset)`)
    return undefined
  }
  try {
    // lowercase → checksum
    return getAddress(raw.toLowerCase() as `0x${string}`)
  } catch {
    warnOnce(`[addresses] ${key} is invalid: ${raw}`)
    return undefined
  }
}

/* one-time logger (avoids spam during HMR/SSR re-renders) */
const _warned = new Set<string>()
function warnOnce(msg: string) {
  if (_warned.has(msg)) return
  _warned.add(msg)
  // eslint-disable-next-line no-console
  console.warn(msg)
}

/* ───────────────────────────────── ADDRESSES ───────────────────────────────── */

export type AddressKey = "REGISTRY" | "HUB" | "RATINGS" | "USDC"

export const REGISTRY = normEnvAddress("NEXT_PUBLIC_PROFILE_REGISTRY")
export const HUB = normEnvAddress("NEXT_PUBLIC_CREATOR_HUB")
export const RATINGS = normEnvAddress("NEXT_PUBLIC_RATINGS")
export const USDC = normEnvAddress("NEXT_PUBLIC_USDC")

/** Aliases for legacy imports */
export const PROFILE_REGISTRY = REGISTRY
export const CREATOR_HUB = HUB

/** Frozen map if you ever want to iterate or pass around all addresses. */
export const ADDR: Readonly<Record<AddressKey, `0x${string}` | undefined>> = Object.freeze({
  REGISTRY,
  HUB,
  RATINGS,
  USDC,
})

/* ──────────────────────────────── HELPERS ─────────────────────────────────── */

/**
 * Throws with a friendly message if any required address is missing.
 * Use this in actions/server routes *before* making writes so errors are clear.
 *
 * Example:
 *   assertAddresses("HUB", "USDC")
 */
export function assertAddresses(...keys: AddressKey[]) {
  for (const k of keys) {
    if (!ADDR[k]) {
      throw new Error(
        `[addresses] Missing required address: ${k}. Ensure NEXT_PUBLIC_* env vars are set (and not 0x0...).`
      )
    }
  }
}

/** Light guard that you are connected to the intended chain. */
export function assertChainId(currentChainId?: number) {
  if (currentChainId == null) return
  if (currentChainId !== CHAIN_ID) {
    throw new Error(
      `[chain] Wrong network. Expected ${CHAIN_ID} (${CHAIN.name}), got ${currentChainId}.`
    )
  }
}

/** Utility: short 0x address (0x1234…abcd) */
export function shortAddr(addr?: `0x${string}`, left = 6, right = 4) {
  if (!addr) return ""
  return `${addr.slice(0, left)}…${addr.slice(-right)}`
}

/** Utility: link to address on BaseScan (respects BASESCAN_URL). */
export function basescanAddressUrl(addr: `0x${string}`) {
  return `${BASESCAN_URL}/address/${addr}`
}

/** Utility: link to tx on BaseScan (respects BASESCAN_URL). */
export function basescanTxUrl(txHash: `0x${string}`) {
  return `${BASESCAN_URL}/tx/${txHash}`
}

/** Returns true if all "core" contracts are configured. */
export function hasCoreAddresses() {
  return Boolean(REGISTRY && HUB && RATINGS)
}

/** Narrowing helper: get an address or undefined with exhaustive key support. */
export function getAddr(key: AddressKey): `0x${string}` | undefined {
  return ADDR[key]
}

/**
 * Strict getter that throws if missing.
 * Useful when you *must* have the address in a particular code path.
 */
export function requireAddr(key: AddressKey): `0x${string}` {
  const v = ADDR[key]
  if (!v) throw new Error(`[addresses] Required address missing: ${key}`)
  return v
}
