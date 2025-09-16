// /hooks/useRatings.ts
"use client"

import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi"
import { base } from "viem/chains"
import RatingsAbi from "@/abi/Ratings"

const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}`

/** Average score x100 (e.g., 423 => 4.23) */
export function useAverage(ratee?: `0x${string}`) {
  return useReadContract({
    abi: RatingsAbi,
    address: RATINGS,
    functionName: "getAverage",
    args: ratee ? [ratee] : undefined,
    query: { enabled: !!ratee },
  })
}

/** Count + totalScore */
export function useRatingStats(ratee?: `0x${string}`) {
  return useReadContract({
    abi: RatingsAbi,
    address: RATINGS,
    functionName: "getStats",
    args: ratee ? [ratee] : undefined,
    query: { enabled: !!ratee },
  })
}

/** The connected user’s rating of `ratee` */
export function useMyRating(ratee?: `0x${string}`) {
  const { address } = useAccount()
  return useReadContract({
    abi: RatingsAbi,
    address: RATINGS,
    functionName: "getRating",
    args: address && ratee ? [address, ratee] : undefined,
    query: { enabled: !!address && !!ratee },
  })
}

/** Whether the connected user has rated `ratee` */
export function useHasRated(ratee?: `0x${string}`) {
  const { address } = useAccount()
  return useReadContract({
    abi: RatingsAbi,
    address: RATINGS,
    functionName: "hasRated",
    args: address && ratee ? [address, ratee] : undefined,
    query: { enabled: !!address && !!ratee },
  })
}

/** Submit a new rating (awaits receipt internally) */
export function useRate() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const rate = async (ratee: `0x${string}`, score: number, comment: string) => {
    if (!address) throw new Error("Connect your wallet to rate.")
    const hash = await writeContractAsync({
      abi: RatingsAbi,
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
    if (!address) throw new Error("Connect your wallet to update a rating.")
    const hash = await writeContractAsync({
      abi: RatingsAbi,
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
