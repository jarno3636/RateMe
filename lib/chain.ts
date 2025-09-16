// /lib/chain.ts
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

/**
 * Public, read-only client for server-side usage.
 * - Falls back to viem's default RPC if env is missing
 * - Enables multicall batching for performance
 * - Slightly slower polling to reduce RPC churn
 */
export const publicClient = createPublicClient({
  chain: base,
  transport: process.env.NEXT_PUBLIC_BASE_RPC_URL
    ? http(process.env.NEXT_PUBLIC_BASE_RPC_URL)
    : http(), // safe fallback to default
  batch: { multicall: true },
  pollingInterval: 8_000,
})
