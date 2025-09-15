// /hooks/useRatings.ts
"use client"

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import Ratings from "@/abi/Ratings"

const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}`

/** Average score x100 (e.g., 423 => 4.23) */
export function useAverage(ratee?: `0x${string}`) {
  return useReadContract({
    abi: Ratings as any,
    address: RATINGS,
    functionName: "getAverage",
    args: ratee ? [ratee] : undefined,
    query: { enabled: !!ratee },
  })
}

/** Count + totalScore */
export function useRatingStats(ratee?: `0x${string}`) {
  return useReadContract({
    abi: Ratings as any,
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
    abi: Ratings as any,
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
    abi: Ratings as any,
    address: RATINGS,
    functionName: "hasRated",
    args: address && ratee ? [address, ratee] : undefined,
    query: { enabled: !!address && !!ratee },
  })
}

/** Submit a new rating */
export function useRate() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  return {
    rate: (ratee: `0x${string}`, score: number, comment: string) =>
      writeContract({
        abi: Ratings as any,
        address: RATINGS,
        functionName: "rate",
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
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  return {
    update: (ratee: `0x${string}`, newScore: number, newComment: string) =>
      writeContract({
        abi: Ratings as any,
        address: RATINGS,
        functionName: "updateRating",
        args: [ratee, newScore, newComment],
      }),
    hash,
    isPending,
    wait,
    error,
  }
}
