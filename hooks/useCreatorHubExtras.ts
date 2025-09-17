// hooks/useCreatorHubExtras.ts
"use client"

import { base } from "viem/chains"
import { useAccount, usePublicClient, useWriteContract } from "wagmi"
import * as ADDR from "@/lib/addresses"
import CreatorHubAbi from "@/abi/CreatorHub.json"

// Guard: HUB must exist
function useHubAddr(): `0x${string}` {
  if (!ADDR.HUB) throw new Error("Missing HUB address (NEXT_PUBLIC_CREATOR_HUB).")
  return ADDR.HUB
}

/**
 * updatePost(id, token, price, active, accessViaSub, uri)
 * Convenience wrapper: if token not passed, defaults to ADDR.USDC (if set).
 */
export function useUpdatePost() {
  const hub = useHubAddr()
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function update(
    id: bigint,
    token: `0x${string}`,
    price: bigint,
    active: boolean,
    accessViaSub: boolean,
    uri: string
  ) {
    if (!address) throw new Error("Connect your wallet.")
    const hash = await writeContractAsync({
      abi: CreatorHubAbi as any,
      address: hub,
      functionName: "updatePost",
      args: [id, token, price, active, accessViaSub, uri],
      chain: base,
      account: address,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { update, isPending, error }
}

/**
 * updatePlan(id, name, metadataURI, pricePerPeriod, periodDays, active)
 */
export function useUpdatePlan() {
  const hub = useHubAddr()
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function update(
    id: bigint,
    name: string,
    metadataURI: string,
    pricePerPeriod: bigint,
    periodDays: number,
    active: boolean
  ) {
    if (!address) throw new Error("Connect your wallet.")
    const hash = await writeContractAsync({
      abi: CreatorHubAbi as any,
      address: hub,
      functionName: "updatePlan",
      args: [id, name, metadataURI, pricePerPeriod, periodDays, active],
      chain: base,
      account: address,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { update, isPending, error }
}
