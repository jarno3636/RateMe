// /hooks/useSpendApproval.ts
"use client"

import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from "wagmi"
import { base } from "viem/chains"
import type { Address } from "viem"           // ✅ type-only import
import { erc20Abi, maxUint256 } from "viem"
import { REGISTRY as REGISTRY_ADDR, USDC as USDC_ADDR } from "@/lib/addresses"

/* ───────────────────────────── Helpers ───────────────────────────── */

function assertAddr(name: string, addr?: Address | `0x${string}`) {
  if (!addr) throw new Error(`${name} address is not configured.`)
}

/** Clamp bigint >= 0n; coerce undefined/null to 0n. */
function toNonNegBig(v?: bigint | null): bigint {
  try {
    if (typeof v === "bigint") return v >= 0n ? v : 0n
  } catch {}
  return 0n
}

/* ───────────────────────────── Reads ────────────────────────────── */

/**
 * Read USDC allowance from `owner -> spender`.
 * Defaults: owner = connected account, spender = REGISTRY.
 */
export function useUsdcAllowance(
  ownerOverride?: `0x${string}`,
  spenderOverride?: `0x${string}`,
) {
  const { address } = useAccount()
  const owner = (ownerOverride ?? address) as `0x${string}` | undefined
  const spender = (spenderOverride ?? (REGISTRY_ADDR as `0x${string}` | undefined)) as
    | `0x${string}`
    | undefined

  const enabled = !!owner && !!spender && !!USDC_ADDR

  return useReadContract({
    abi: erc20Abi,
    address: enabled ? (USDC_ADDR as `0x${string}`) : undefined,
    functionName: "allowance",
    args: enabled ? [owner!, spender!] : undefined,
    query: { enabled },
  })
}

/* ───────────────────────────── Writes ───────────────────────────── */

/**
 * Approve / Revoke USDC allowance to a spender (default: REGISTRY).
 * - approve(amount) → approves exact amount (or max if omitted).
 * - approveMax() → maxUint256.
 * - revoke() → sets allowance to 0.
 * All functions await the transaction receipt.
 */
export function useApproveUsdc(spenderOverride?: `0x${string}`) {
  const { address } = useAccount()
  const client = usePublicClient()
  const { writeContractAsync, isPending, error } = useWriteContract()
  const spender = (spenderOverride ?? (REGISTRY_ADDR as `0x${string}` | undefined)) as
    | `0x${string}`
    | undefined

  async function approve(amount?: bigint) {
    assertAddr("USDC", USDC_ADDR)
    assertAddr("spender (REGISTRY)", spender)
    if (!address) throw new Error("Connect your wallet.")
    const c = client
    if (!c) throw new Error("Public client not initialized")

    const amt = amount ?? maxUint256
    const hash = await writeContractAsync({
      abi: erc20Abi,
      address: USDC_ADDR as `0x${string}`,
      functionName: "approve",
      args: [spender as `0x${string}`, amt],
      account: address,
      chain: base,
    })
    await c.waitForTransactionReceipt({ hash })
    return hash
  }

  async function approveMax() {
    return approve(maxUint256)
  }

  async function revoke() {
    return approve(0n)
  }

  return { approve, approveMax, revoke, isPending, error }
}

/* ───────────────── Convenience: Ensure Allowance ────────────────── */

/**
 * ensureUsdcAllowance(minAmount, owner?, spender?)
 * - Checks current allowance (owner->spender) for USDC.
 * - If < minAmount, approves the missing delta (exact amount, not max).
 * - Returns { ok: boolean, txHash?: 0x..., missing: bigint }.
 *
 * Usage:
 * const { ensure } = useEnsureUsdcAllowance()
 * const res = await ensure(requiredFee)
 * if (!res.ok) { /* show error */ /* }
 */
export function useEnsureUsdcAllowance(
  ownerOverride?: `0x${string}`,
  spenderOverride?: `0x${string}`,
) {
  const { address } = useAccount()
  const pub = usePublicClient() // ✅ capture hook result here (not inside function)
  const owner = (ownerOverride ?? address) as `0x${string}` | undefined
  const spender = (spenderOverride ?? (REGISTRY_ADDR as `0x${string}` | undefined)) as
    | `0x${string}`
    | undefined

  const allowanceQuery = useUsdcAllowance(owner, spender)
  const { approve, isPending } = useApproveUsdc(spender)

  async function ensure(minAmount?: bigint) {
    assertAddr("USDC", USDC_ADDR)
    assertAddr("spender (REGISTRY)", spender)
    if (!owner) throw new Error("Connect your wallet.")

    const required = toNonNegBig(minAmount)
    if (required === 0n) return { ok: true as const, missing: 0n as const }

    // If query hasn't resolved yet, do a one-off read as a fallback.
    let current = allowanceQuery.data as bigint | undefined
    if (current === undefined) {
      try {
        const c = pub
        if (!c) throw new Error("Public client not initialized")
        current = (await c.readContract({
          abi: erc20Abi,
          address: USDC_ADDR as `0x${string}`,
          functionName: "allowance",
          args: [owner as `0x${string}`, spender as `0x${string}`],
        })) as bigint
      } catch {
        current = 0n
      }
    }

    const has = toNonNegBig(current)
    if (has >= required) return { ok: true as const, missing: 0n as const }

    const missing = required - has
    const txHash = await approve(missing)
    return { ok: true as const, txHash, missing }
  }

  return { ensure, isPending, allowanceQuery }
}
