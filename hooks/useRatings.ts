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

function clampScore(s: number) {
  // Force integer 1..5
  return Math.max(1, Math.min(5, Math.floor(Number.isFinite(s) ? s : 5)))
}

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

/** Generic read for any (rater, ratee) pair */
export function useRatingOf(rater?: `0x${string}`, ratee?: `0x${string}`, opt?: WatchOpt) {
  const read = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS_ADDR,
    functionName: "getRating",
    args: rater && ratee ? [rater, ratee] : undefined,
    query: { enabled: !!RATINGS_ADDR && !!rater && !!ratee },
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

/* ----------------------------- WRITES ----------------------------- */

function toUserError(e: unknown, fallback = "Transaction failed") {
  if (e && typeof e === "object" && "message" in e) return (e as any).message as string
  return String(e ?? fallback)
}

/** Submit a new rating (preflight simulate; awaits receipt internally) */
export function useRate() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const rate = async (ratee: `0x${string}`, score: number, comment: string) => {
    if (!RATINGS_ADDR) throw new Error("Ratings contract address is not configured.")
    if (!address) throw new Error("Connect your wallet to rate.")

    const argScore = BigInt(clampScore(score))
    const argComment = String(comment ?? "").trim()

    // Preflight simulate to surface allowance or require conditions
    try {
      await client.simulateContract({
        abi: RatingsAbi as any,
        address: RATINGS_ADDR,
        functionName: "rate",
        args: [ratee, Number(argScore), argComment],
        account: address,
        chain: base,
      })
    } catch (e) {
      throw new Error(toUserError(e, "Rating would revert"))
    }

    const hash = await writeContractAsync({
      abi: RatingsAbi as any,
      address: RATINGS_ADDR,
      functionName: "rate",
      args: [ratee, Number(argScore), argComment],
      account: address,
      chain: base,
    })

    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { rate, isPending, error }
}

/** Update an existing rating (preflight simulate; awaits receipt internally) */
export function useUpdateRating() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const update = async (ratee: `0x${string}`, newScore: number, newComment: string) => {
    if (!RATINGS_ADDR) throw new Error("Ratings contract address is not configured.")
    if (!address) throw new Error("Connect your wallet to update a rating.")

    const argScore = BigInt(clampScore(newScore))
    const argComment = String(newComment ?? "").trim()

    try {
      await client.simulateContract({
        abi: RatingsAbi as any,
        address: RATINGS_ADDR,
        functionName: "updateRating",
        args: [ratee, Number(argScore), argComment],
        account: address,
        chain: base,
      })
    } catch (e) {
      throw new Error(toUserError(e, "Update would revert"))
    }

    const hash = await writeContractAsync({
      abi: RatingsAbi as any,
      address: RATINGS_ADDR,
      functionName: "updateRating",
      args: [ratee, Number(argScore), argComment],
      account: address,
      chain: base,
    })

    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { update, isPending, error }
}
