"use client"

import { Address } from "viem"
import { useUSDCAllowance, useUSDCApprove } from "./useUsdc"

export function useSpendApproval(spender?: Address, amount?: bigint) {
  const { data: current } = useUSDCAllowance(spender as Address | undefined)
  const { approve, isPending, wait, error } = useUSDCApprove()
  const hasAllowance = (!!amount && (current ?? 0n) >= amount) || false

  return {
    hasAllowance,
    approveExact: async () => {
      if (!spender || !amount || amount <= 0n) return
      const tx = await approve(spender, amount)
      await wait.wait
      return tx
    },
    isPending,
    error,
  }
}
