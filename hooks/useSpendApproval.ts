// /hooks/useSpendApproval.ts
"use client"

import { useEffect, useMemo } from "react"
import { Address, maxUint256 } from "viem"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

type SpendApproval = {
  allowance: bigint
  hasAllowance: boolean
  needsApproval: boolean
  approveExact: () => Promise<`0x${string}` | void>
  approveMax: () => Promise<`0x${string}` | void>
  isPending: boolean         // tx pending
  isFetching: boolean        // reading allowance
  error?: Error | null
  refetchAllowance: () => void
  status: "idle" | "fetching" | "pending-tx"
  /** convenience for buttons/tooltips */
  ready: boolean
  reason?: string
}

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

  // Auto-refresh when inputs change (avoid stale reads)
  useEffect(() => {
    if (spender) void refetch()
  }, [spender, amt, refetch])

  const approveExact = async () => {
    if (!spender || amt <= 0n) return
    const tx = await approve(spender, amt) // waits for receipt
    refetch() // optimistic
    return tx
  }

  const approveMax = async () => {
    if (!spender) return
    const tx = await approve(spender, maxUint256)
    refetch()
    return tx
  }

  const status: SpendApproval["status"] = isPending ? "pending-tx" : isFetching ? "fetching" : "idle"

  const { ready, reason } = useMemo(() => {
    if (!spender) return { ready: false, reason: "Missing spender address" }
    if (amt < 0n) return { ready: false, reason: "Invalid approval amount" }
    return { ready: true, reason: undefined }
  }, [spender, amt])

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
    status,
    ready,
    reason,
  }
}
