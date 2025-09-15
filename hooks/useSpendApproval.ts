// /hooks/useSpendApproval.ts
"use client"

import { Address } from "viem"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

export function useSpendApproval(spender?: Address, amount?: bigint) {
  const { data: currentAllowance } = useUSDCAllowance(spender)
  const { approve, isPending, error } = useUSDCApprove()

  const hasAllowance =
    amount !== undefined && (currentAllowance ?? 0n) >= amount

  const approveExact = async () => {
    if (!spender || !amount || amount <= 0n) return
    return approve(spender, amount) // waits for receipt internally
  }

  return { hasAllowance, approveExact, isPending, error }
}
