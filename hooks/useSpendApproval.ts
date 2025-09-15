// /hooks/useSpendApproval.ts
"use client"

import { Address } from "viem"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

export function useSpendApproval(spender?: Address, amount?: bigint) {
  // Current allowance for spender
  const { data: currentAllowance } = useUSDCAllowance(spender)
  const { approve, isPending, wait, error } = useUSDCApprove()

  // Check if allowance is sufficient
  const hasAllowance =
    amount !== undefined && (currentAllowance ?? 0n) >= amount

  // Approve exactly the amount needed (could switch to maxUint256 if you want fewer prompts)
  const approveExact = async () => {
    if (!spender || !amount || amount <= 0n) return
    const tx = await approve(spender, amount)
    await wait.wait
    return tx
  }

  return {
    hasAllowance,
    approveExact,
    isPending,
    error,
  }
}
