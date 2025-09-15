// /hooks/useRatings.ts
"use client"

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"
import { base } from "viem/chains"
import RatingsAbi from "@/abi/Ratings" // <-- use your typed TS ABI (as const)

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

/** Submit a new rating */
export function useRate() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  return {
    rate: (ratee: `0x${string}`, score: number, comment: string) => {
      if (!address) throw new Error("Connect your wallet to rate.")
      return writeContract({
        abi: RatingsAbi,
        address: RATINGS,
        functionName: "rate",
        account: address,   // required by wagmi v2 union
        chain: base,        // <-- satisfies the required 'chain: Chain'
        args: [ratee, score, comment],
      })
    },
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
    update: (ratee: `0x${string}`, newScore: number, newComment: string) => {
      if (!address) throw new Error("Connect your wallet to update a rating.")
      return writeContract({
        abi: RatingsAbi,
        address: RATINGS,
        functionName: "updateRating",
        account: address,
        chain: base, // <-- required
        args: [ratee, newScore, newComment],
      })
    },
    hash,
    isPending,
    wait,
    error,
  }
}
