// hooks/useCreatorHubExtras.ts
"use client"

import {
  useAccount,
  usePublicClient,
  useWriteContract,
} from "wagmi"
import { base } from "viem/chains"
import * as ADDR from "@/lib/addresses"
import CreatorHubAbi from "@/abi/CreatorHub.json"

// Guard: require HUB address present
function useHubAddr(): `0x${string}` {
  if (!ADDR.HUB) throw new Error("Missing HUB address (NEXT_PUBLIC_CREATOR_HUB).")
  return ADDR.HUB
}

/** createPost(price(6dp), subGate, uri) */
export function useCreatePost() {
  const hub = useHubAddr()
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function create(price: bigint, subGate: boolean, uri: string) {
    if (!address) throw new Error("Connect your wallet.")
    const hash = await writeContractAsync({
      abi: CreatorHubAbi as any,
      address: hub,
      functionName: "createPost",
      args: [price, subGate, uri],
      chain: base,
      account: address,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { create, isPending, error }
}

/** updatePost(id, price(6dp), subGate, uri) */
export function useUpdatePost() {
  const hub = useHubAddr()
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function update(id: bigint, price: bigint, subGate: boolean, uri: string) {
    if (!address) throw new Error("Connect your wallet.")
    const hash = await writeContractAsync({
      abi: CreatorHubAbi as any,
      address: hub,
      functionName: "updatePost",
      args: [id, price, subGate, uri],
      chain: base,
      account: address,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { update, isPending, error }
}

/** setPostActive(id, active) */
export function useSetPostActive() {
  const hub = useHubAddr()
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function setActive(id: bigint, active: boolean) {
    if (!address) throw new Error("Connect your wallet.")
    const hash = await writeContractAsync({
      abi: CreatorHubAbi as any,
      address: hub,
      functionName: "setPostActive",
      args: [id, active],
      chain: base,
      account: address,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { setActive, isPending, error }
}

/** createPlan(price(6dp), periodDays, name) */
export function useCreatePlan() {
  const hub = useHubAddr()
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function create(price: bigint, periodDays: bigint, name: string) {
    if (!address) throw new Error("Connect your wallet.")
    const hash = await writeContractAsync({
      abi: CreatorHubAbi as any,
      address: hub,
      functionName: "createPlan",
      args: [price, periodDays, name],
      chain: base,
      account: address,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { create, isPending, error }
}

/** setPlanActive(id, active) */
export function useSetPlanActive() {
  const hub = useHubAddr()
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function setActive(id: bigint, active: boolean) {
    if (!address) throw new Error("Connect your wallet.")
    const hash = await writeContractAsync({
      abi: CreatorHubAbi as any,
      address: hub,
      functionName: "setPlanActive",
      args: [id, active],
      chain: base,
      account: address,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { setActive, isPending, error }
}
