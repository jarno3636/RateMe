// /hooks/useRatings.ts
"use client"

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"

// If your ABI file is JSON, import it directly so TS can infer types:
import RatingsAbi from "@/abi/Ratings.json"

const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}`

/** Average score x100 (e.g., 423 => 4.23) */
export function useAverage(ratee?: `0x${string}`) {
  return useReadContract({
    abi: RatingsAbi as const,
    address: RATINGS,
    functionName: "getAverage",
    args: ratee ? [ratee] : undefined,
    query: { enabled: !!ratee },
  })
}

/** Count + totalScore */
export function useRatingStats(ratee?: `0x${string}`) {
  return useReadContract({
    abi: RatingsAbi as const,
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
    abi: RatingsAbi as const,
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
    abi: RatingsAbi as const,
    address: RATINGS,
    functionName: "hasRated",
    args: address && ratee ? [address, ratee] : undefined,
    query: { enabled: !!address && !!ratee },
  })
}

/** Submit a new rating */
export function useRate() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  return {
    rate: (ratee: `0x${string}`, score: number, comment: string) =>
      writeContract({
        abi: RatingsAbi as const,
        address: RATINGS,
        functionName: "rate",
        // wagmi v2 types expect an account in this branch of the union
        account: address,
        args: [ratee, score, comment],
      }),
    hash,
    isPending,
    wait,
    error,
  }
}

/** Update an existing rating */
export function useUpdateRating() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  return {
    update: (ratee: `0x${string}`, newScore: number, newComment: string) =>
      writeContract({
        abi: RatingsAbi as const,
        address: RATINGS,
        functionName: "updateRating",
        account: address,
        args: [ratee, newScore, newComment],
      }),
    hash,
    isPending,
    wait,
    error,
  }
}
