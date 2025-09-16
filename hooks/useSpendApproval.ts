// /hooks/useSpendApproval.ts
"use client"

import { Address, maxUint256 } from "viem"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

export function useSpendApproval(spender?: Address, amount?: bigint) {
  const { data: currentAllowanceRaw } = useUSDCAllowance(spender)
  const currentAllowance = (currentAllowanceRaw ?? 0n) as bigint

  const { approve, isPending, error } = useUSDCApprove()

  const needsAmount = (amount ?? 0n) > 0n
  const hasAllowance = needsAmount ? currentAllowance >= (amount as bigint) : true
  const needsApproval = needsAmount && !hasAllowance

  /** Approve exactly the needed amount */
  const approveExact = async () => {
    if (!spender || !needsAmount) return
    return approve(spender, amount as bigint) // waits for receipt internally
  }

  /** Approve max (reduce future prompts) */
  const approveMax = async () => {
    if (!spender) return
    return approve(spender, maxUint256) // waits for receipt internally
  }

  return {
    hasAllowance,
    needsApproval,
    approveExact,
    approveMax,
    isPending,
    error,
  }
}
