// /lib/chain.ts
import "server-only"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL
if (!rpcUrl) {
  console.warn(
    "[chain] NEXT_PUBLIC_BASE_RPC_URL not set, using viem default (rate-limited)"
  )
}

export const publicClient = createPublicClient({
  chain: base,
  transport: rpcUrl ? http(rpcUrl) : http(),
  batch: { multicall: true },
  pollingInterval: 8_000,
})
