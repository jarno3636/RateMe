// /lib/env.ts
/**
 * Tiny runtime env helper (safe on server & client).
 * - Never throws at import time.
 * - Strongly typed accessors + friendly validators.
 * - Works with our addresses helpers (USDC optional).
 */

import { base } from "viem/chains"

/** Keys we consider *required* for the core app to function. */
const REQUIRED_KEYS = [
  "NEXT_PUBLIC_PROFILE_REGISTRY",
  "NEXT_PUBLIC_CREATOR_HUB",
  "NEXT_PUBLIC_RATINGS",
] as const

/** Keys that are nice-to-have but optional (we degrade gracefully). */
const OPTIONAL_KEYS = [
  "NEXT_PUBLIC_BASE_RPC_URL",
  "NEXT_PUBLIC_BASESCAN_URL",
  "NEXT_PUBLIC_USDC", // optional in our codebase
  "NEXT_PUBLIC_BASE_CHAIN_ID", // optional; defaults to Base mainnet
] as const

export type RequiredKey = (typeof REQUIRED_KEYS)[number]
export type OptionalKey = (typeof OPTIONAL_KEYS)[number]
export type AnyKey = RequiredKey | OptionalKey

/** One-time warning guard (avoid spam in dev/HMR). */
const _warned = new Set<string>()
function warnOnce(msg: string) {
  if (_warned.has(msg)) return
  _warned.add(msg)
  // eslint-disable-next-line no-console
  console.warn(msg)
}

/** Raw getter (string or undefined). Never throws. */
export function getEnvRaw<K extends AnyKey>(key: K): string | undefined {
  const v = (process.env as Record<string, string | undefined>)[key]
  return v?.trim() ? v.trim() : undefined
}

/** Parse to number (undefined if not set or invalid). */
export function getEnvNumber<K extends AnyKey>(key: K): number | undefined {
  const v = getEnvRaw(key)
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** Boolean parser: ("1","true","yes","on") → true; ("0","false","no","off") → false. */
export function getEnvBool<K extends AnyKey>(key: K): boolean | undefined {
  const v = getEnvRaw(key)?.toLowerCase()
  if (v == null) return undefined
  if (["1", "true", "yes", "on"].includes(v)) return true
  if (["0", "false", "no", "off"].includes(v)) return false
  return undefined
}

/**
 * Validate core environment.
 * - Does NOT throw on import — call `assertEnvStrict()` when you need hard guarantees
 *   (e.g., in route handlers before sending a tx).
 */
export function validateEnv() {
  // Required presence
  for (const k of REQUIRED_KEYS) {
    if (!getEnvRaw(k)) warnOnce(`[env] Missing required ${k}. Features depending on it will be disabled.`)
  }

  // Chain id sanity (optional)
  const cid = getEnvNumber("NEXT_PUBLIC_BASE_CHAIN_ID")
  if (cid !== undefined && cid !== base.id) {
    warnOnce(`[env] NEXT_PUBLIC_BASE_CHAIN_ID is ${cid}, expected ${base.id} (Base).`)
  }
}

/** Throw if anything critical is missing; use in critical paths. */
export function assertEnvStrict() {
  const missing = REQUIRED_KEYS.filter((k) => !getEnvRaw(k))
  if (missing.length) {
    throw new Error(`[env] Missing required env var(s): ${missing.join(", ")}`)
  }
  const cid = getEnvNumber("NEXT_PUBLIC_BASE_CHAIN_ID")
  if (cid !== undefined && cid !== base.id) {
    throw new Error(`[env] Wrong chain id: ${cid}. Expected ${base.id} (Base).`)
  }
}

/** Convenience: list what’s missing (for diagnostics UI). */
export function getMissingEnv(): RequiredKey[] {
  return REQUIRED_KEYS.filter((k) => !getEnvRaw(k))
}

/** Export a compact, typed snapshot for consumers that want a single import. */
export const ENV = {
  // Required (may be undefined if caller did not assert)
  PROFILE_REGISTRY: getEnvRaw("NEXT_PUBLIC_PROFILE_REGISTRY"),
  CREATOR_HUB: getEnvRaw("NEXT_PUBLIC_CREATOR_HUB"),
  RATINGS: getEnvRaw("NEXT_PUBLIC_RATINGS"),

  // Optional
  BASE_RPC_URL: getEnvRaw("NEXT_PUBLIC_BASE_RPC_URL"),
  BASESCAN_URL: getEnvRaw("NEXT_PUBLIC_BASESCAN_URL"),
  USDC: getEnvRaw("NEXT_PUBLIC_USDC"),
  BASE_CHAIN_ID: getEnvNumber("NEXT_PUBLIC_BASE_CHAIN_ID") ?? base.id,
} as const

// Run lightweight validation once on import (non-throwing).
validateEnv()
