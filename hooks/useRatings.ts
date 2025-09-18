// /hooks/useRatings.ts
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
import RatingsAbi from "@/abi/Ratings.json"
import { RATINGS as RATINGS_ADDR } from "@/lib/addresses" // ✅ normalized address

type WatchOpt = { watch?: boolean }

/* Refetch helper on new blocks when watch=true */
function useRefetchOnBlock(refetch?: () => void, watch?: boolean) {
  const { data: _bn } = useBlockNumber({
    watch: !!watch,
    query: { enabled: !!watch },
  })
  useEffect(() => {
    if (watch) refetch?.()
  }, [watch, _bn, refetch])
}

/** Average score x100 (e.g., 423 => 4.23) */
export function useAverage(ratee?: `0x${string}`, opt?: WatchOpt) {
  const read = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS_ADDR,
    functionName: "getAverage",
    args: ratee ? [ratee] : undefined,
    query: { enabled: !!RATINGS_ADDR && !!ratee },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/** Count + totalScore */
export function useRatingStats(ratee?: `0x${string}`, opt?: WatchOpt) {
  const read = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS_ADDR,
    functionName: "getStats",
    args: ratee ? [ratee] : undefined,
    query: { enabled: !!RATINGS_ADDR && !!ratee },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/** The connected user’s rating of `ratee` */
export function useMyRating(ratee?: `0x${string}`, opt?: WatchOpt) {
  const { address } = useAccount()
  const read = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS_ADDR,
    functionName: "getRating",
    args: address && ratee ? [address, ratee] : undefined,
    query: { enabled: !!RATINGS_ADDR && !!address && !!ratee },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/** Whether the connected user has rated `ratee` */
export function useHasRated(ratee?: `0x${string}`, opt?: WatchOpt) {
  const { address } = useAccount()
  const read = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS_ADDR,
    functionName: "hasRated",
    args: address && ratee ? [address, ratee] : undefined,
    query: { enabled: !!RATINGS_ADDR && !!address && !!ratee },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/** Submit a new rating (awaits receipt internally) */
export function useRate() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const rate = async (ratee: `0x${string}`, score: number, comment: string) => {
    if (!RATINGS_ADDR) throw new Error("Ratings contract address is not configured.")
    if (!address) throw new Error("Connect your wallet to rate.")
    const hash = await writeContractAsync({
      abi: RatingsAbi as any,
      address: RATINGS_ADDR,
      functionName: "rate",
      args: [ratee, Math.max(1, Math.min(5, Math.floor(score || 5))), comment],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { rate, isPending, error }
}

/** Update an existing rating (awaits receipt internally) */
export function useUpdateRating() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const update = async (ratee: `0x${string}`, newScore: number, newComment: string) => {
    if (!RATINGS_ADDR) throw new Error("Ratings contract address is not configured.")
    if (!address) throw new Error("Connect your wallet to update a rating.")
    const hash = await writeContractAsync({
      abi: RatingsAbi as any,
      address: RATINGS_ADDR,
      functionName: "updateRating",
      args: [ratee, Math.max(1, Math.min(5, Math.floor(newScore || 5))), newComment],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { update, isPending, error }
}
