// /hooks/useCreatorHubExtras.ts
"use client"

import { base } from "viem/chains"
import { useAccount, usePublicClient, useWriteContract } from "wagmi"
import * as ADDR from "@/lib/addresses"
import { assertAddresses } from "@/lib/addresses"
import CreatorHubAbi from "@/abi/CreatorHub.json"

/** Resolve and assert HUB address (clear error instead of deep revert) */
function useHubAddr(): `0x${string}` {
  assertAddresses("HUB") // throws with a friendly message if missing
  // ADDR.HUB is guaranteed after assert
  return ADDR.HUB as `0x${string}`
}

/** Tiny helper to format unknown errors nicely */
function toUserError(e: unknown, fallback = "Transaction failed") {
  if (e && typeof e === "object" && "message" in e) return (e as any).message as string
  return String(e ?? fallback)
}

/**
 * updatePost(id, token, price, active, accessViaSub, uri)
 * - If `token` is omitted, defaults to ADDR.USDC (and asserts it exists).
 * - Simulates before sending to catch reverts with a readable message.
 */
export function useUpdatePost() {
  const hub = useHubAddr()
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function update(
    id: bigint,
    tokenOrPrice: `0x${string}` | bigint, // allow (id, price, ...) if you prefer default token
    priceOrActive: bigint | boolean,
    activeOrGate?: boolean,
    gateOrUri?: boolean | string,
    maybeUri?: string
  ) {
    if (!address) throw new Error("Connect your wallet.")

    // Overload handling so devs can call update(id, price, active, gate, uri)
    let token: `0x${string}` | undefined
    let price: bigint
    let active: boolean
    let accessViaSub: boolean
    let uri: string

    if (typeof tokenOrPrice === "string") {
      // Full signature: (id, token, price, active, accessViaSub, uri)
      token = tokenOrPrice as `0x${string}`
      price = priceOrActive as bigint
      active = activeOrGate as boolean
      accessViaSub = gateOrUri as boolean
      uri = (maybeUri ?? "") as string
    } else {
      // Short signature: (id, price, active, accessViaSub, uri) with default USDC
      assertAddresses("USDC")
      token = ADDR.USDC as `0x${string}`
      price = tokenOrPrice as bigint
      active = priceOrActive as boolean
      accessViaSub = activeOrGate as boolean
      uri = (gateOrUri ?? "") as string
    }

    // Preflight simulate to surface revert reasons before we send
    try {
      await client.simulateContract({
        abi: CreatorHubAbi as any,
        address: hub,
        functionName: "updatePost",
        args: [id, token, price, active, accessViaSub, uri],
        chain: base,
        account: address,
      })
    } catch (e) {
      throw new Error(toUserError(e, "Update would revert"))
    }

    try {
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
    } catch (e) {
      throw new Error(toUserError(e))
    }
  }

  return { update, isPending, error }
}

/**
 * updatePlan(id, name, metadataURI, pricePerPeriod, periodDays, active)
 * - Simulates before send for early revert reasons.
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

    // Preflight simulate
    try {
      await client.simulateContract({
        abi: CreatorHubAbi as any,
        address: hub,
        functionName: "updatePlan",
        args: [id, name.trim(), metadataURI.trim(), pricePerPeriod, periodDays, active],
        chain: base,
        account: address,
      })
    } catch (e) {
      throw new Error(toUserError(e, "Update would revert"))
    }

    try {
      const hash = await writeContractAsync({
        abi: CreatorHubAbi as any,
        address: hub,
        functionName: "updatePlan",
        args: [id, name.trim(), metadataURI.trim(), pricePerPeriod, periodDays, active],
        chain: base,
        account: address,
      })
      await client.waitForTransactionReceipt({ hash })
      return hash
    } catch (e) {
      throw new Error(toUserError(e))
    }
  }

  return { update, isPending, error }
}
