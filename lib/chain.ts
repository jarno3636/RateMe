// /lib/chain.ts  (client- & server-safe)
import { createPublicClient, http } from "viem"
// NOTE: Avoid importing PublicClient/Chain types directly to prevent
// "two different types with this name exist" when multiple viem versions slip in.
import { CHAIN as RAW_CHAIN, CHAIN_ID, RPC_URL } from "@/lib/addresses"

/**
 * Centralized viem public client
 * - Uses NEXT_PUBLIC_BASE_RPC_URL when set, otherwise falls back to chain defaults.
 * - Safe to import from server & client components.
 * - Singleton to avoid multiple polling loops during HMR.
 */

// Narrow the shape at the boundary to avoid cross-package type identity issues.
const CHAIN = RAW_CHAIN as unknown as Parameters<typeof createPublicClient>[0]["chain"]

function pickRpcUrl(): string {
  // Prefer explicit env override
  if (RPC_URL) return RPC_URL

  // Fallback to first default RPC from chain config (usually rate-limited/public)
  const defaults = (CHAIN as any)?.rpcUrls?.default?.http ?? []
  if (Array.isArray(defaults) && defaults.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[chain] NEXT_PUBLIC_BASE_RPC_URL not set; using chain default RPC (may be rate-limited)",
      )
    }
    return String(defaults[0]!)
  }

  // As a last resort, viem http() still requires a URL; throw early to avoid silent failures
  throw new Error("[chain] No RPC URL available. Set NEXT_PUBLIC_BASE_RPC_URL.")
}

// Use ReturnType<> so we don't import viem's PublicClient type (prevents duplication issues)
type VClient = ReturnType<typeof createPublicClient>

let _client: VClient | null = null

function makeClient(): VClient {
  const url = pickRpcUrl()
  // Keep options minimal to reduce surface for structural type mismatches across versions.
  return createPublicClient({
    chain: CHAIN,
    transport: http(url),
    batch: { multicall: true },
    // pollingInterval is supported broadly; keep it but cast if needed.
    pollingInterval: 8_000 as number,
  } as any) // final cast to insulate from subtle version diffs in config type
}

/** Singleton getter (avoids multiple polling intervals in dev/HMR) */
export function getPublicClient(): VClient {
  if (!_client) _client = makeClient()
  return _client
}

/** Export a ready-to-use instance for convenience */
export const publicClient = getPublicClient()

/** Optional guard for callers who want a friendly error on wrong network */
export async function assertPublicClientChain(client: VClient = publicClient) {
  const current = await client.getChainId()
  if (current !== CHAIN_ID) {
    // Use CHAIN.name if present, but avoid strict typing to keep this import-agnostic.
    const chainName = (CHAIN as any)?.name ?? "unknown"
    throw new Error(
      `[chain] Wrong network. Expected ${CHAIN_ID} (${chainName}), got ${current}.`,
    )
  }
}
