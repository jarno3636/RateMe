// /hooks/useSpendApproval.ts
"use client"

import { Address, maxUint256 } from "viem"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

type SpendApproval = {
  allowance: bigint
  hasAllowance: boolean
  needsApproval: boolean
  approveExact: () => Promise<`0x${string}` | void>
  approveMax: () => Promise<`0x${string}` | void>
  isPending: boolean
  isFetching: boolean
  error?: Error | null
  refetchAllowance: () => void
  /** Convenience aggregate for UI states */
  status: "idle" | "fetching" | "pending-tx"
}

/** Generic USDC spend-approval helper.
 * - Pass the contract `spender` and the exact `amount` you plan to spend (USDC 6dp).
 * - If either is missing/zero, `needsApproval` is false and approve calls no-op.
 */
export function useSpendApproval(spender?: Address, amount?: bigint): SpendApproval {
  const {
    data: allowanceRaw,
    refetch,
    isFetching,
  } = useUSDCAllowance(spender)

  const { approve, isPending, error } = useUSDCApprove()

  const allowance = (allowanceRaw ?? 0n) as bigint
  const amt = (amount ?? 0n) < 0n ? 0n : (amount ?? 0n)

  const hasAllowance = amt === 0n ? true : allowance >= amt
  const needsApproval = !hasAllowance && amt > 0n && !!spender

  const approveExact = async () => {
    if (!spender || amt <= 0n) return
    const tx = await approve(spender, amt) // waits for receipt internally
    // optimistic refresh so UI updates without waiting for next block poll
    refetch()
    return tx
  }

  const approveMax = async () => {
    if (!spender) return
    const tx = await approve(spender, maxUint256)
    refetch()
    return tx
  }

  return {
    allowance,
    hasAllowance,
    needsApproval,
    approveExact,
    approveMax,
    isPending,
    isFetching,
    error: (error as Error | null) ?? null,
    refetchAllowance: () => { void refetch() },
    status: isPending ? "pending-tx" : isFetching ? "fetching" : "idle",
  }
}
