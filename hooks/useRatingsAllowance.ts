// /hooks/useRatingsAllowance.ts
"use client"

import Ratings from "@/abi/Ratings"
import { useReadContract } from "wagmi"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}`

export function useRatingsAllowance() {
  // fee() -> uint256, feeCollector() -> address
  const { data: feeUnits, isLoading: feeLoading, refetch: refetchFee } = useReadContract({
    abi: Ratings as any,
    address: RATINGS,
    functionName: "fee",
  })

  const { data: collector } = useReadContract({
    abi: Ratings as any,
    address: RATINGS,
    functionName: "feeCollector",
  })

  const { data: allowance } = useUSDCAllowance(RATINGS)
  const { approve, isPending } = useUSDCApprove()

  const fee = (feeUnits ?? 0n) as bigint
  const currentAllowance = (allowance ?? 0n) as bigint
  const hasAllowance = currentAllowance >= fee

  const approveForFee = async () => {
    if (fee > 0n) {
      await approve(RATINGS, fee) // waits for receipt internally
      // Optional: refresh fee/allowance callers can refetch if needed
    }
  }

  return {
    fee,                               // bigint (USDC 6dp)
    feeCollector: (collector ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    hasAllowance,                      // boolean
    approveForFee,                     // function
    states: { loading: feeLoading, approving: isPending },
    errors: {},
    refetchFee,                        // in case you want to re-pull fee on UI event
  }
}
