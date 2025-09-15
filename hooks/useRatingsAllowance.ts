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
  const { approve, isPending, wait } = useUSDCApprove()

  const fee = (feeUnits ?? 0n) as bigint
  const hasAllowance = (allowance ?? 0n) >= fee

  return {
    fee,
    hasAllowance,
    approveForFee: async () => {
      if (fee > 0n) {
        const tx = await approve(RATINGS, fee)
        await wait.wait
        return tx
      }
    },
    states: { loading: feeUnits === undefined, approving: isPending },
    errors: {},
  }
}
