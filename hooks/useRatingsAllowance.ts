// /hooks/useRatingsAllowance.ts
"use client"

import RatingsAbi from "@/abi/Ratings.json"
import { useReadContract } from "wagmi"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"
import { RATINGS as RATINGS_ADDR } from "@/lib/addresses"  // ✅ normalized

export function useRatingsAllowance() {
  const ratingsOk = !!RATINGS_ADDR

  // fee() -> uint256
  const { data: feeUnits, isLoading: feeLoading, refetch: refetchFee } = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS_ADDR,
    functionName: "fee",
    query: { enabled: ratingsOk },
  })

  // feeCollector() -> address (optional)
  const { data: collector } = useReadContract({
    abi: RatingsAbi as any,
    address: RATINGS_ADDR,
    functionName: "feeCollector",
    query: { enabled: ratingsOk },
  })

  // USDC allowance for Ratings (spender = Ratings contract)
  const { data: allowance } = useUSDCAllowance(RATINGS_ADDR)
  const { approve, isPending } = useUSDCApprove()

  const fee = (feeUnits ?? 0n) as bigint
  const currentAllowance = (allowance ?? 0n) as bigint
  const hasAllowance = currentAllowance >= fee

  const approveForFee = async () => {
    if (!RATINGS_ADDR) throw new Error("Ratings contract address is not configured.")
    if (fee > 0n) await approve(RATINGS_ADDR, fee)
  }

  return {
    fee,
    feeCollector: ((collector as `0x${string}`) ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    hasAllowance,
    approveForFee,
    states: { loading: feeLoading, approving: isPending },
    errors: {},
    refetchFee,
  }
}
