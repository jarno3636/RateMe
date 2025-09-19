// /hooks/useRatingsAllowance.ts
"use client"

import RatingsAbi from "@/abi/Ratings.json"
import { useReadContract } from "wagmi"
import { formatUnits } from "viem"
import { useUSDCAllowance, useUSDCApprove, useUSDCMeta } from "@/hooks/useUsdc"
import { RATINGS as RATINGS_ADDR } from "@/lib/addresses"  // ✅ normalized

/**
 * Premium helper for the Ratings USDC fee flow:
 * - Reads fee() and feeCollector()
 * - Reads USDC decimals and allowance(owner -> Ratings)
 * - Returns whether allowance covers fee and how much is missing
 * - Provides approveForFee() to approve the exact missing amount
 */
export function useRatingsAllowance() {
  const ratingsOk = !!RATINGS_ADDR

  // fee() -> uint256
  const {
    data: feeUnits,
    isLoading: feeLoading,
    refetch: refetchFee,
  } = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS_ADDR,
    functionName: "fee",
    query: { enabled: ratingsOk },
  })

  // feeCollector() -> address (optional, for UI transparency)
  const { data: collector } = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS_ADDR,
    functionName: "feeCollector",
    query: { enabled: ratingsOk },
  })

  // USDC metadata & allowance for Ratings (spender = Ratings contract)
  const { decimals, symbol } = useUSDCMeta()
  const { data: allowanceRaw, refetch: refetchAllowance } = useUSDCAllowance(RATINGS_ADDR)
  const { approve, isPending: approving } = useUSDCApprove()

  const fee = (feeUnits ?? 0n) as bigint
  const allowance = (allowanceRaw ?? 0n) as bigint
  const hasAllowance = allowance >= fee
  const missing = hasAllowance ? 0n : (fee - allowance)

  const display = {
    fee: formatUnits(fee, decimals),
    allowance: formatUnits(allowance, decimals),
    missing: formatUnits(missing, decimals),
    symbol,
    decimals,
  }

  const approveForFee = async () => {
    if (!RATINGS_ADDR) throw new Error("Ratings contract address is not configured.")
    if (missing > 0n) {
      await approve(RATINGS_ADDR, missing) // approve exactly what's missing (or change to max approval if preferred)
      await Promise.all([refetchAllowance(), refetchFee()])
    }
  }

  return {
    fee,
    feeCollector: ((collector as `0x${string}`) ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    allowance,
    hasAllowance,
    missing,
    display,
    approveForFee,
    states: { loading: feeLoading, approving },
    errors: {},
    refetch: () => {
      refetchFee()
      refetchAllowance()
    },
  }
}
