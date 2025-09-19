// /hooks/useCreatorHub.ts
"use client"

import { useEffect } from "react"
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useBlockNumber,
} from "wagmi"
import { base } from "viem/chains"
import CreatorHub from "@/abi/CreatorHub.json"
import * as ADDR from "@/lib/addresses"
import { assertAddresses } from "@/lib/addresses"
import { Address, isAddressEqual } from "viem"

/* ─────────────────────────── Types & utils ─────────────────────────── */

type WatchOpt = { watch?: boolean }
const ZERO: Address = "0x0000000000000000000000000000000000000000"

function toUserError(e: unknown, fallback = "Transaction failed") {
  if (e && typeof e === "object" && "message" in e) return (e as any).message as string
  return String(e ?? fallback)
}

function isZeroAddr(a?: Address) {
  return !!a && isAddressEqual(a, ZERO)
}

/* Small helper to refetch on new blocks when opt.watch = true */
function useRefetchOnBlock(refetch?: () => void, watch?: boolean) {
  const { data: blockNumber } = useBlockNumber({
    watch: !!watch,
    query: { enabled: !!watch },
  })
  useEffect(() => {
    if (watch) refetch?.()
  }, [watch, blockNumber, refetch])
}

/* Shared HUB address (checksummed or undefined) */
const HUB = ADDR.HUB // may be undefined if not configured

/* ────────────────────────────── READS ────────────────────────────── */

export function useCreatorPlanIds(creator?: `0x${string}`, opt?: WatchOpt) {
  const read = useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "getCreatorPlanIds",
    args: creator ? [creator] : undefined,
    query: { enabled: !!HUB && !!creator },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

export function useCreatorPostIds(creator?: `0x${string}`, opt?: WatchOpt) {
  const read = useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "getCreatorPostIds",
    args: creator ? [creator] : undefined,
    query: { enabled: !!HUB && !!creator },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/** plans(id) → { creator, token, pricePerPeriod, periodDays, active, name, metadataURI } */
export function usePlan(id?: bigint, opt?: WatchOpt) {
  const read = useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "plans",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: !!HUB && id !== undefined },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/** posts(id) → { creator, token, price, active, accessViaSub, uri } */
export function usePost(id?: bigint, opt?: WatchOpt) {
  const read = useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "posts",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: !!HUB && id !== undefined },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

export function useHasPostAccess(user?: `0x${string}`, postId?: bigint, opt?: WatchOpt) {
  const read = useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "hasPostAccess",
    args: user && postId !== undefined ? [user, postId] : undefined,
    query: { enabled: !!HUB && !!user && postId !== undefined },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

export function useIsActive(subscriber?: `0x${string}`, creator?: `0x${string}`, opt?: WatchOpt) {
  const read = useReadContract({
    abi: CreatorHub as any,
    address: HUB,
    functionName: "isActive",
    args: subscriber && creator ? [subscriber, creator] : undefined,
    query: { enabled: !!HUB && !!subscriber && !!creator },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/* ───────────────────────────── WRITES ───────────────────────────── */

/**
 * subscribe(planId, periods)
 * - Auto-detects token type from plans(planId).
 * - If token == 0x0, pays native with value = pricePerPeriod * periods.
 * - Else, ERC20 path (no value). Use payment preview + allowance flow from extras.
 */
export function useSubscribe() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const subscribe = async (planId: bigint, periods: number) => {
    assertAddresses("HUB")
    if (!address) throw new Error("Connect wallet")

    // Read plan to determine token & price
    const plan = await client.readContract({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "plans",
      args: [planId],
    }) as unknown as {
      0: `0x${string}` // creator
      1: `0x${string}` // token
      2: bigint        // pricePerPeriod
      3: number        // periodDays
      4: boolean       // active
      5: string        // name
      6: string        // metadataURI
    }

    const token = plan?.[1] as Address | undefined
    const pricePerPeriod = plan?.[2] as bigint
    const total = pricePerPeriod * BigInt(periods)

    // Preflight simulate (with or without value)
    await client.simulateContract({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "subscribe",
      args: [planId, periods],
      account: address,
      chain: base,
      ...(isZeroAddr(token) ? { value: total } : {}),
    }).catch((e) => { throw new Error(toUserError(e, "Subscribe would revert")) })

    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "subscribe",
      args: [planId, periods],
      account: address,
      chain: base,
      ...(isZeroAddr(token) ? { value: total } : {}),
    })

    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { subscribe, isPending, error }
}

/**
 * buyPost(postId)
 * - Auto-detects token type from posts(postId).
 * - If token == 0x0, pays native with value = price.
 * - Else, ERC20 path (no value). Use payment preview + allowance flow from extras.
 */
export function useBuyPost() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const buy = async (postId: bigint) => {
    assertAddresses("HUB")
    if (!address) throw new Error("Connect wallet")

    const post = await client.readContract({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "posts",
      args: [postId],
    }) as unknown as {
      0: `0x${string}` // creator
      1: `0x${string}` // token
      2: bigint        // price
      3: boolean       // active
      4: boolean       // accessViaSub
      5: string        // uri
    }

    const token = post?.[1] as Address | undefined
    const price = post?.[2] as bigint

    // Preflight simulate (value only for native)
    await client.simulateContract({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "buyPost",
      args: [postId],
      account: address,
      chain: base,
      ...(isZeroAddr(token) ? { value: price } : {}),
    }).catch((e) => { throw new Error(toUserError(e, "Purchase would revert")) })

    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "buyPost",
      args: [postId],
      account: address,
      chain: base,
      ...(isZeroAddr(token) ? { value: price } : {}),
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { buy, isPending, error }
}

/**
 * createPlan(token, pricePerPeriod, periodDays, name, metadataURI)
 */
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
    assertAddresses("HUB")
    if (!address) throw new Error("Connect wallet")

    await client.simulateContract({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "createPlan",
      args: [token, pricePerPeriod, periodDays, name.trim(), metadataURI.trim()],
      account: address,
      chain: base,
    }).catch((e) => { throw new Error(toUserError(e, "Create plan would revert")) })

    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "createPlan",
      args: [token, pricePerPeriod, periodDays, name.trim(), metadataURI.trim()],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { createPlan, isPending, error }
}

/**
 * createPost(token, price, accessViaSub, uri)
 */
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
    assertAddresses("HUB")
    if (!address) throw new Error("Connect wallet")

    await client.simulateContract({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "createPost",
      args: [token, price, accessViaSub, uri.trim()],
      account: address,
      chain: base,
    }).catch((e) => { throw new Error(toUserError(e, "Create post would revert")) })

    const hash = await writeContractAsync({
      abi: CreatorHub as any,
      address: ADDR.HUB as `0x${string}`,
      functionName: "createPost",
      args: [token, price, accessViaSub, uri.trim()],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { createPost, isPending, error }
}
