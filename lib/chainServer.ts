// /lib/chainServer.ts
import "server-only"
import { createPublicClient, http, type PublicClient } from "viem"
import { CHAIN, CHAIN_ID, RPC_URL } from "@/lib/addresses"

/**
 * Server-only viem PublicClient (singleton)
 * - Uses NEXT_PUBLIC_BASE_RPC_URL when provided; otherwise falls back to CHAIN defaults.
 * - Lives on the server to keep RPC keys private and avoid extra client bundles.
 * - Exported as both a getter (preferred) and a ready instance for convenience.
 */

function pickRpcUrl(): string {
  if (RPC_URL) return RPC_URL

  const defaults = (CHAIN.rpcUrls?.default?.http ?? []).filter(Boolean)
  if (defaults.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[chainServer] NEXT_PUBLIC_BASE_RPC_URL not set; using chain default RPC (may be rate-limited)")
    }
    return defaults[0]!
  }
  throw new Error("[chainServer] No RPC URL available. Set NEXT_PUBLIC_BASE_RPC_URL.")
}

let _serverClient: PublicClient | null = null

function makeServerClient(): PublicClient {
  const url = pickRpcUrl()
  return createPublicClient({
    chain: CHAIN,
    transport: http(url),
    batch: { multicall: true },
    pollingInterval: 8_000,
  })
}

/** Preferred: get the singleton instance (avoids multiple polling loops on HMR). */
export function getServerPublicClient(): PublicClient {
  if (!_serverClient) _serverClient = makeServerClient()
  return _serverClient
}

/** Convenience export (identical instance as the getter above). */
export const publicServerClient = getServerPublicClient()

/** Optional guard for routes/actions that require the expected network. */
export async function assertServerClientChain(client: PublicClient = publicServerClient) {
  const current = await client.getChainId()
  if (current !== CHAIN_ID) {
    throw new Error(
      `[chainServer] Wrong network. Expected ${CHAIN_ID} (${CHAIN.name}), got ${current}.`
    )
  }
}
