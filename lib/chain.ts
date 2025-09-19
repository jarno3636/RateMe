// /lib/chain.ts  (client- & server-safe)
import { createPublicClient, http, type PublicClient } from "viem"
import { CHAIN, CHAIN_ID, RPC_URL } from "@/lib/addresses"

/**
 * Centralized viem public client
 * - Uses NEXT_PUBLIC_BASE_RPC_URL when set, otherwise falls back to chain defaults.
 * - Safe to import from server & client components.
 * - Singleton to avoid multiple polling loops during HMR.
 */

function pickRpcUrl(): string {
  // Prefer explicit env override
  if (RPC_URL) return RPC_URL

  // Fallback to first default RPC from chain config (usually rate-limited/public)
  const defaults = (CHAIN.rpcUrls?.default?.http ?? []).filter(Boolean)
  if (defaults.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[chain] NEXT_PUBLIC_BASE_RPC_URL not set; using chain default RPC (may be rate-limited)")
    }
    return defaults[0]!
  }

  // As a last resort, viem http() still requires a URL; throw early to avoid silent failures
  throw new Error("[chain] No RPC URL available. Set NEXT_PUBLIC_BASE_RPC_URL.")
}

let _client: PublicClient | null = null

function makeClient(): PublicClient {
  const url = pickRpcUrl()
  return createPublicClient({
    chain: CHAIN,
    transport: http(url),
    batch: { multicall: true },
    pollingInterval: 8_000,
  })
}

/** Singleton getter (avoids multiple polling intervals in dev/HMR) */
export function getPublicClient(): PublicClient {
  if (!_client) _client = makeClient()
  return _client
}

/** Export a ready-to-use instance for convenience */
export const publicClient = getPublicClient()

/** Optional guard for callers who want a friendly error on wrong network */
export async function assertPublicClientChain(client: PublicClient = publicClient) {
  const current = await client.getChainId()
  if (current !== CHAIN_ID) {
    throw new Error(`[chain] Wrong network. Expected ${CHAIN_ID} (${CHAIN.name}), got ${current}.`)
  }
}
