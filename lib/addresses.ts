// /lib/addresses.ts
import { getAddress } from "viem"
import { base } from "viem/chains"

/**
 * Centralized, safe address/config accessors.
 * - Works on server & client (NEXT_PUBLIC_* values are inlined at build time).
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

/* ───────────────────────────── one-time logger ───────────────────────────── */
const _warned = new Set<string>()
function warnOnce(msg: string) {
  if (_warned.has(msg)) return
  _warned.add(msg)
  // eslint-disable-next-line no-console
  console.warn(msg)
}

/* ───────────────────────────── helpers ───────────────────────────── */
function norm(val?: string | null, label?: string): `0x${string}` | undefined {
  const raw = (val || "").trim()
  if (!raw) {
    if (label) warnOnce(`[addresses] ${label} is not set`)
    return undefined
  }
  if (/^0x0+$/i.test(raw)) {
    if (label) warnOnce(`[addresses] ${label} is zero address (treated as unset)`)
    return undefined
  }
  try {
    return getAddress(raw as `0x${string}`)
  } catch {
    if (label) warnOnce(`[addresses] ${label} is invalid: ${raw}`)
    return undefined
  }
}

/* ───────────────────────────── ADDRESSES ─────────────────────────────
   IMPORTANT: use *static* env reads so Next can inline them client-side.
   Do NOT use process.env[key] with a dynamic key string.
------------------------------------------------------------------------ */

const ENV_PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY
const ENV_CREATOR_HUB     = process.env.NEXT_PUBLIC_CREATOR_HUB
const ENV_RATINGS         = process.env.NEXT_PUBLIC_RATINGS
const ENV_USDC            = process.env.NEXT_PUBLIC_USDC

export type AddressKey = "REGISTRY" | "HUB" | "RATINGS" | "USDC"

export const REGISTRY = norm(ENV_PROFILE_REGISTRY, "NEXT_PUBLIC_PROFILE_REGISTRY")
export const HUB      = norm(ENV_CREATOR_HUB,     "NEXT_PUBLIC_CREATOR_HUB")
export const RATINGS  = norm(ENV_RATINGS,         "NEXT_PUBLIC_RATINGS")
export const USDC     = norm(ENV_USDC,            "NEXT_PUBLIC_USDC")

/** Aliases for legacy imports */
export const PROFILE_REGISTRY = REGISTRY
export const CREATOR_HUB      = HUB

/** Frozen map if you ever want to iterate or pass around all addresses. */
export const ADDR: Readonly<Record<AddressKey, `0x${string}` | undefined>> = Object.freeze({
  REGISTRY,
  HUB,
  RATINGS,
  USDC,
})

/* ──────────────────────────────── HELPERS ─────────────────────────────── */

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

/** Utility: links */
export function basescanAddressUrl(addr: `0x${string}`) {
  return `${BASESCAN_URL}/address/${addr}`
}
export function basescanTxUrl(txHash: `0x${string}`) {
  return `${BASESCAN_URL}/tx/${txHash}`
}

/** Returns true if all "core" contracts are configured. */
export function hasCoreAddresses() {
  return Boolean(REGISTRY && HUB && RATINGS && USDC)
}

/** Narrowing helper: get an address or undefined with exhaustive key support. */
export function getAddr(key: AddressKey): `0x${string}` | undefined {
  return ADDR[key]
}

/** Strict getter that throws if missing. */
export function requireAddr(key: AddressKey): `0x${string}` {
  const v = ADDR[key]
  if (!v) throw new Error(`[addresses] Required address missing: ${key}`)
  return v
}
