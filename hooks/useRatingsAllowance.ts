// /hooks/useRatingsAllowance.ts
"use client"

import RatingsAbi from "@/abi/Ratings.json"
import { useReadContract } from "wagmi"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}` | undefined

export function useRatingsAllowance() {
  // fee() -> uint256
  const {
    data: feeUnits,
    isLoading: feeLoading,
    refetch: refetchFee,
  } = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS,
    functionName: "fee",
    // don't query until RATINGS exists
    query: { enabled: !!RATINGS },
  })

  // feeCollector() -> address (optional, but keep enabled guard)
  const { data: collector } = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS,
    functionName: "feeCollector",
    query: { enabled: !!RATINGS },
  })

  // Approvals
  const { data: allowance } = useUSDCAllowance(RATINGS) // hook should no-op if undefined
  const { approve, isPending } = useUSDCApprove()

  const fee = (feeUnits ?? 0n) as bigint
  const currentAllowance = (allowance ?? 0n) as bigint
  const hasAllowance = currentAllowance >= fee

  const approveForFee = async () => {
    if (!RATINGS) throw new Error("Ratings contract address is not configured.")
    if (fee > 0n) {
      await approve(RATINGS, fee) // await receipt internally
    }
  }

  return {
    fee, // bigint (USDC 6dp)
    feeCollector:
      ((collector as `0x${string}`) ??
        "0x0000000000000000000000000000000000000000") as `0x${string}`,
    hasAllowance,
    approveForFee,
    states: { loading: feeLoading, approving: isPending },
    errors: {},
    refetchFee,
  }
}
