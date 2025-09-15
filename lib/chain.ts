// /lib/chain.ts
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || undefined),
})
