// /hooks/useRatingsAllowance.ts
"use client"

import Ratings from "@/abi/Ratings"
import { useReadContract } from "wagmi"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}`

export function useRatingsAllowance() {
  const { data: feeUnits } = useReadContract({
    abi: Ratings as any,
    address: RATINGS,
    functionName: "fee",
  })

  const { data: allowance } = useUSDCAllowance(RATINGS)
  const { approve, isPending } = useUSDCApprove()

  const fee = (feeUnits ?? 0n) as bigint
  const hasAllowance = (allowance ?? 0n) >= fee

  const approveForFee = async () => {
    if (fee > 0n) return approve(RATINGS, fee) // waits for receipt internally
  }

  return {
    fee,
    hasAllowance,
    approveForFee,
    states: { loading: feeUnits === undefined, approving: isPending },
    errors: {},
  }
}
