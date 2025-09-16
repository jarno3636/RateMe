// /lib/chain.ts
import { createPublicClient, http, type PublicClient } from "viem"
import { base } from "viem/chains"

/**
 * Public, read-only client for server-side usage.
 * - Uses NEXT_PUBLIC_BASE_RPC_URL if set, otherwise falls back to viem default
 * - Enables multicall batching for performance
 * - Slightly slower polling to reduce RPC churn
 */
const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL
if (!rpcUrl) {
  console.warn("[chain] NEXT_PUBLIC_BASE_RPC_URL not set, using default viem RPC (slower, rate limited)")
}

export const publicClient: PublicClient<typeof base> = createPublicClient({
  chain: base,
  transport: rpcUrl ? http(rpcUrl) : http(),
  batch: { multicall: true },
  pollingInterval: 8_000,
})
