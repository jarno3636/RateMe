// /hooks/useCreatorHub.ts
"use client"

import { usePublicClient, useReadContract, useWriteContract } from "wagmi"
import CreatorHub from "@/abi/CreatorHub.json"

const HUB = process.env.NEXT_PUBLIC_CREATOR_HUB as `0x${string}`

/* ---------- READS (unchanged) ---------- */
export function useCreatorPlanIds(creator?: `0x${string}`) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "getCreatorPlanIds",
    args: creator ? [creator] : undefined,
    query: { enabled: !!creator },
  })
}

export function useCreatorPostIds(creator?: `0x${string}`) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "getCreatorPostIds",
    args: creator ? [creator] : undefined,
    query: { enabled: !!creator },
  })
}

export function usePlan(id?: bigint) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "plans",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined },
  })
}

export function usePost(id?: bigint) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "posts",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined },
  })
}

export function useHasPostAccess(user?: `0x${string}`, postId?: bigint) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "hasPostAccess",
    args: user && postId !== undefined ? [user, postId] : undefined,
    query: { enabled: !!user && postId !== undefined },
  })
}

export function useIsActive(subscriber?: `0x${string}`, creator?: `0x${string}`) {
  return useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "isActive",
    args: subscriber && creator ? [subscriber, creator] : undefined,
    query: { enabled: !!subscriber && !!creator },
  })
}

/* ---------- FAN ACTIONS (awaits receipt) ---------- */
export function useSubscribe() {
  const client = usePublicClient()
  const { writeContractAsync, isPending, error } = useWriteContract()
  const subscribe = async (planId: bigint, periods: number) => {
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "subscribe",
      args: [planId, periods],
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }
  return { subscribe, isPending, error }
}

export function useBuyPost() {
  const client = usePublicClient()
  const { writeContractAsync, isPending, error } = useWriteContract()
  const buy = async (postId: bigint) => {
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "buyPost",
      args: [postId],
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }
  return { buy, isPending, error }
}

/* ---------- CREATOR ACTIONS (awaits receipt) ---------- */
export function useCreatePlan() {
  const client = usePublicClient()
  const { writeContractAsync, isPending, error } = useWriteContract()
  const createPlan = async (
    token: `0x${string}`,
    pricePerPeriod: bigint,
    periodDays: number,
    name: string,
    metadataURI: string
  ) => {
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "createPlan",
      args: [token, pricePerPeriod, periodDays, name, metadataURI],
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }
  return { createPlan, isPending, error }
}

export function useUpdatePlan() {
  const client = usePublicClient()
  const { writeContractAsync, isPending, error } = useWriteContract()
  const updatePlan = async (
    id: bigint,
    name: string,
    metadataURI: string,
    pricePerPeriod: bigint,
    periodDays: number,
    active: boolean
  ) => {
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "updatePlan",
      args: [id, name, metadataURI, pricePerPeriod, periodDays, active],
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }
  return { updatePlan, isPending, error }
}

export function useCreatePost() {
  const client = usePublicClient()
  const { writeContractAsync, isPending, error } = useWriteContract()
  const createPost = async (
    token: `0x${string}`,
    price: bigint,
    accessViaSub: boolean,
    uri: string
  ) => {
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "createPost",
      args: [token, price, accessViaSub, uri],
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }
  return { createPost, isPending, error }
}

export function useUpdatePost() {
  const client = usePublicClient()
  const { writeContractAsync, isPending, error } = useWriteContract()
  const updatePost = async (
    id: bigint,
    token: `0x${string}`,
    price: bigint,
    active: boolean,
    accessViaSub: boolean,
    uri: string
  ) => {
    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: HUB,
      functionName: "updatePost",
      args: [id, token, price, active, accessViaSub, uri],
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }
  return { updatePost, isPending, error }
}
