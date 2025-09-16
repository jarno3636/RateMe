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

const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}` | undefined

type WatchOpt = { watch?: boolean }

/* refetch helper */
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
    address: RATINGS,
    functionName: "getAverage",
    args: ratee ? [ratee] : undefined,
    query: { enabled: !!RATINGS && !!ratee },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/** Count + totalScore */
export function useRatingStats(ratee?: `0x${string}`, opt?: WatchOpt) {
  const read = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS,
    functionName: "getStats",
    args: ratee ? [ratee] : undefined,
    query: { enabled: !!RATINGS && !!ratee },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/** The connected user’s rating of `ratee` */
export function useMyRating(ratee?: `0x${string}`, opt?: WatchOpt) {
  const { address } = useAccount()
  const read = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS,
    functionName: "getRating",
    args: address && ratee ? [address, ratee] : undefined,
    query: { enabled: !!RATINGS && !!address && !!ratee },
  })
  useRefetchOnBlock(read.refetch, opt?.watch)
  return read
}

/** Whether the connected user has rated `ratee` */
export function useHasRated(ratee?: `0x${string}`, opt?: WatchOpt) {
  const { address } = useAccount()
  const read = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS,
    functionName: "hasRated",
    args: address && ratee ? [address, ratee] : undefined,
    query: { enabled: !!RATINGS && !!address && !!ratee },
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
    if (!RATINGS) throw new Error("Ratings contract address is not configured.")
    if (!address) throw new Error("Connect your wallet to rate.")
    const hash = await writeContractAsync({
      abi: RatingsAbi as any,
      address: RATINGS,
      functionName: "rate",
      args: [ratee, score, comment],
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
    if (!RATINGS) throw new Error("Ratings contract address is not configured.")
    if (!address) throw new Error("Connect your wallet to update a rating.")
    const hash = await writeContractAsync({
      abi: RatingsAbi as any,
      address: RATINGS,
      functionName: "updateRating",
      args: [ratee, newScore, newComment],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { update, isPending, error }
}
