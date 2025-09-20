// /lib/chainServer.ts
import "server-only"
import { createPublicClient, http } from "viem"
// Avoid importing viem's PublicClient/Chain types directly to prevent
// "two different types with this name exist" errors when multiple viem copies are present.
import { CHAIN as RAW_CHAIN, CHAIN_ID, RPC_URL } from "@/lib/addresses"

/**
 * Server-only viem PublicClient (singleton)
 * - Uses NEXT_PUBLIC_BASE_RPC_URL when provided; otherwise falls back to CHAIN defaults.
 * - Lives on the server to keep RPC keys private and avoid extra client bundles.
 * - Exported as both a getter (preferred) and a ready instance for convenience.
 */

// Narrow the chain type at the boundary to sidestep cross-package type identity issues.
const CHAIN = RAW_CHAIN as unknown as Parameters<typeof createPublicClient>[0]["chain"]

function pickRpcUrl(): string {
  if (RPC_URL) return RPC_URL

  const defaults = (CHAIN as any)?.rpcUrls?.default?.http ?? []
  if (Array.isArray(defaults) && defaults.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[chainServer] NEXT_PUBLIC_BASE_RPC_URL not set; using chain default RPC (may be rate-limited)",
      )
    }
    return String(defaults[0]!)
  }
  throw new Error("[chainServer] No RPC URL available. Set NEXT_PUBLIC_BASE_RPC_URL.")
}

// Use ReturnType so we don't import the PublicClient type (prevents duplication issues)
type VClient = ReturnType<typeof createPublicClient>

let _serverClient: VClient | null = null

function makeServerClient(): VClient {
  const url = pickRpcUrl()
  // Minimal config + final 'as any' to insulate from subtle version diffs in the config type.
  return createPublicClient({
    chain: CHAIN,
    transport: http(url),
    batch: { multicall: true },
    pollingInterval: 8_000 as number,
  } as any)
}

/** Preferred: get the singleton instance (avoids multiple polling loops on HMR). */
export function getServerPublicClient(): VClient {
  if (!_serverClient) _serverClient = makeServerClient()
  return _serverClient
}

/** Convenience export (identical instance as the getter above). */
export const publicServerClient = getServerPublicClient()

/** Optional guard for routes/actions that require the expected network. */
export async function assertServerClientChain(client: VClient = publicServerClient) {
  const current = await client.getChainId()
  if (current !== CHAIN_ID) {
    const chainName = (CHAIN as any)?.name ?? "unknown"
    throw new Error(
      `[chainServer] Wrong network. Expected ${CHAIN_ID} (${chainName}), got ${current}.`,
    )
  }
}
