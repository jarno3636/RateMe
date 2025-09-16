// /hooks/useCreatorHub.ts
"use client"

import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi"
import { base } from "viem/chains"
import CreatorHub from "@/abi/CreatorHub.json"

const HUB = process.env.NEXT_PUBLIC_CREATOR_HUB as `0x${string}` | undefined

type WatchOpt = { watch?: boolean }

/* ----------------------------- READS ----------------------------- */

export function useCreatorPlanIds(creator?: `0x${string}`, opt?: WatchOpt) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "getCreatorPlanIds",
    args: creator ? [creator] : undefined,
    watch: !!opt?.watch,
    query: { enabled: !!HUB && !!creator },
  })
}

export function useCreatorPostIds(creator?: `0x${string}`, opt?: WatchOpt) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "getCreatorPostIds",
    args: creator ? [creator] : undefined,
    watch: !!opt?.watch,
    query: { enabled: !!HUB && !!creator },
  })
}

export function usePlan(id?: bigint, opt?: WatchOpt) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "plans",
    args: id !== undefined ? [id] : undefined,
    watch: !!opt?.watch,
    query: { enabled: !!HUB && id !== undefined },
  })
}

export function usePost(id?: bigint, opt?: WatchOpt) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "posts",
    args: id !== undefined ? [id] : undefined,
    watch: !!opt?.watch,
    query: { enabled: !!HUB && id !== undefined },
  })
}

export function useHasPostAccess(user?: `0x${string}`, postId?: bigint, opt?: WatchOpt) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "hasPostAccess",
    args: user && postId !== undefined ? [user, postId] : undefined,
    watch: !!opt?.watch,
    query: { enabled: !!HUB && !!user && postId !== undefined },
  })
}

export function useIsActive(subscriber?: `0x${string}`, creator?: `0x${string}`, opt?: WatchOpt) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "isActive",
    args: subscriber && creator ? [subscriber, creator] : undefined,
    watch: !!opt?.watch,
    query: { enabled: !!HUB && !!subscriber && !!creator },
  })
}

/* ----------------------------- WRITES ----------------------------- */

export function useSubscribe() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const subscribe = async (planId: bigint, periods: number) => {
    if (!HUB) throw new Error("CreatorHub address is not configured.")
    if (!address) throw new Error("Connect wallet")
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "subscribe",
      args: [planId, periods],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }
  return { subscribe, isPending, error }
}

export function useBuyPost() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const buy = async (postId: bigint) => {
    if (!HUB) throw new Error("CreatorHub address is not configured.")
    if (!address) throw new Error("Connect wallet")
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "buyPost",
      args: [postId],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }
  return { buy, isPending, error }
}

export function useCreatePlan() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const createPlan = async (
    token: `0x${string}`,
    pricePerPeriod: bigint,
    periodDays: number,
    name: string,
    metadataURI: string
  ) => {
    if (!HUB) throw new Error("CreatorHub address is not configured.")
    if (!address) throw new Error("Connect wallet")
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "createPlan",
      args: [token, pricePerPeriod, periodDays, name, metadataURI],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { createPlan, isPending, error }
}

export function useCreatePost() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const createPost = async (
    token: `0x${string}`,
    price: bigint,
    accessViaSub: boolean,
    uri: string
  ) => {
    if (!HUB) throw new Error("CreatorHub address is not configured.")
    if (!address) throw new Error("Connect wallet")
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "createPost",
      args: [token, price, accessViaSub, uri],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { createPost, isPending, error }
}
