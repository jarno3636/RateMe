// /hooks/useCreatorHubExtras.ts
"use client"

import { base } from "viem/chains"
import type { Address } from "viem"            // ✅ type-only import (verbatimModuleSyntax)
import { erc20Abi, formatUnits, maxUint256 } from "viem"
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useReadContract,
} from "wagmi"
import * as ADDR from "@/lib/addresses"
import { assertAddresses } from "@/lib/addresses"
import CreatorHubAbi from "@/abi/CreatorHub.json"

/* ─────────────────────────── utils & types ─────────────────────────── */

const ZERO: Address = "0x0000000000000000000000000000000000000000"

function isZeroAddr(a?: Address) {
  return !!a && a.toLowerCase() === ZERO.toLowerCase()
}

function toUserError(e: unknown, fallback = "Transaction failed") {
  if (e && typeof e === "object" && "message" in e) return (e as any).message as string
  return String(e ?? fallback)
}

/** Resolve and assert HUB address (clear error instead of deep revert) */
function useHubAddr(): `0x${string}` {
  assertAddresses("HUB") // throws with a friendly message if missing
  return ADDR.HUB as `0x${string}`
}

/* ───────────────────────── Payment preview helpers ───────────────────────── */

/**
 * Preview payment for a Plan:
 * - Reads plans(planId) to determine token & period price
 * - Calculates total = pricePerPeriod * periods
 * - If ERC20, also returns balance & allowance for the HUB spender
 */
export function usePreviewSubscribe(planId?: bigint, periods: number = 1) {
  const hub = useHubAddr()
  const { address } = useAccount()
  const client = usePublicClient()

  async function run() {
    if (!planId || periods <= 0) return null
    const c = client
    if (!c) throw new Error("Public client not initialized")

    const plan = await c.readContract({
      abi: CreatorHubAbi as any,
      address: hub,
      functionName: "plans",
      args: [planId],
    }) as any

    const token = plan?.[1] as Address
    const pricePerPeriod = plan?.[2] as bigint
    const total = pricePerPeriod * BigInt(periods)

    if (isZeroAddr(token) || !address) {
      return { token, isNative: true, pricePerPeriod, total }
    }

    // ERC20: fetch balance + allowance
    const [balance, allowance, decimals] = await Promise.all([
      c.readContract({ abi: erc20Abi, address: token, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      c.readContract({ abi: erc20Abi, address: token, functionName: "allowance", args: [address, hub] }) as Promise<bigint>,
      c.readContract({ abi: erc20Abi, address: token, functionName: "decimals" }) as Promise<number>,
    ])

    return {
      token,
      isNative: false,
      decimals,
      pricePerPeriod,
      total,
      balance,
      allowance,
      okBalance: balance >= total,
      okAllowance: allowance >= total,
      display: {
        pricePerPeriod: formatUnits(pricePerPeriod, decimals),
        total: formatUnits(total, decimals),
        balance: formatUnits(balance, decimals),
      },
    }
  }

  return { run }
}

/**
 * Preview payment for a Post:
 * - Reads posts(postId) to determine token & price
 * - If ERC20, also returns balance & allowance for the HUB spender
 */
export function usePreviewBuy(postId?: bigint) {
  const hub = useHubAddr()
  const { address } = useAccount()
  const client = usePublicClient()

  async function run() {
    if (!postId) return null
    const c = client
    if (!c) throw new Error("Public client not initialized")

    const post = await c.readContract({
      abi: CreatorHubAbi as any,
      address: hub,
      functionName: "posts",
      args: [postId],
    }) as any

    const token = post?.[1] as Address
    const price = post?.[2] as bigint

    if (isZeroAddr(token) || !address) {
      return { token, isNative: true, price }
    }

    // ERC20
    const [balance, allowance, decimals] = await Promise.all([
      c.readContract({ abi: erc20Abi, address: token, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      c.readContract({ abi: erc20Abi, address: token, functionName: "allowance", args: [address, hub] }) as Promise<bigint>,
      c.readContract({ abi: erc20Abi, address: token, functionName: "decimals" }) as Promise<number>,
    ])

    return {
      token,
      isNative: false,
      decimals,
      price,
      balance,
      allowance,
      okBalance: balance >= price,
      okAllowance: allowance >= price,
      display: {
        price: formatUnits(price, decimals),
        balance: formatUnits(balance, decimals),
      },
    }
  }

  return { run }
}

/* ───────────────────────── ERC20 approval helpers ───────────────────────── */

/**
 * Read an ERC-20 `allowance(owner, HUB)` for any token address.
 */
export function useErc20Allowance(token?: `0x${string}`, ownerOverride?: `0x${string}`) {
  const hub = useHubAddr()
  const { address } = useAccount()
  const owner = (ownerOverride ?? address) as `0x${string}` | undefined
  const enabled = !!token && !!owner

  return useReadContract({
    abi: erc20Abi,
    address: token,
    functionName: "allowance",
    args: enabled ? [owner!, hub] : undefined,
    query: { enabled },
  })
}

/**
 * Approve an ERC-20 for the HUB. Defaults to max approval.
 */
export function useApproveErc20() {
  const hub = useHubAddr()
  const { address } = useAccount()
  const client = usePublicClient()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function approve(token: `0x${string}`, amount?: bigint) {
    if (!address) throw new Error("Connect your wallet.")
    if (!token) throw new Error("Missing token address.")
    const c = client
    if (!c) throw new Error("Public client not initialized")

    // Optional: simulate approve (some ERC20s revert on simulate with 0 gas; often skipped)
    const hash = await writeContractAsync({
      abi: erc20Abi,
      address: token,
      functionName: "approve",
      args: [hub, amount ?? maxUint256],
      chain: base,
      account: address,
    })

    await c.waitForTransactionReceipt({ hash })
    return hash
  }

  return { approve, isPending, error }
}

/* ───────────────────────── Update hooks (from your draft) ───────────────────────── */

/**
 * updatePost(id, token, price, active, accessViaSub, uri)
 * - If `token` omitted, defaults to ADDR.USDC (asserted).
 * - Simulates before sending to catch reverts with readable message.
 */
export function useUpdatePost() {
  assertAddresses("HUB")
  const hub = ADDR.HUB as `0x${string}`
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function update(
    id: bigint,
    tokenOrPrice: `0x${string}` | bigint,
    priceOrActive: bigint | boolean,
    activeOrGate?: boolean,
    gateOrUri?: boolean | string,
    maybeUri?: string
  ) {
    if (!address) throw new Error("Connect your wallet.")
    const c = client
    if (!c) throw new Error("Public client not initialized")

    let token: `0x${string}` | undefined
    let price: bigint
    let active: boolean
    let accessViaSub: boolean
    let uri: string

    if (typeof tokenOrPrice === "string") {
      token = tokenOrPrice as `0x${string}`
      price = priceOrActive as bigint
      active = activeOrGate as boolean
      accessViaSub = gateOrUri as boolean
      uri = (maybeUri ?? "") as string
    } else {
      assertAddresses("USDC")
      token = ADDR.USDC as `0x${string}`
      price = tokenOrPrice as bigint
      active = priceOrActive as boolean
      accessViaSub = activeOrGate as boolean
      uri = (gateOrUri ?? "") as string
    }

    try {
      await c.simulateContract({
        abi: CreatorHubAbi as any,
        address: hub,
        functionName: "updatePost",
        args: [id, token, price, active, accessViaSub, uri],
        chain: base,
        account: address,
      })
    } catch (e) {
      throw new Error(toUserError(e, "Update would revert"))
    }

    try {
      const hash = await writeContractAsync({
        abi: CreatorHubAbi as any,
        address: hub,
        functionName: "updatePost",
        args: [id, token, price, active, accessViaSub, uri],
        chain: base,
        account: address,
      })
      await c.waitForTransactionReceipt({ hash })
      return hash
    } catch (e) {
      throw new Error(toUserError(e))
    }
  }

  return { update, isPending, error }
}

/**
 * updatePlan(id, name, metadataURI, pricePerPeriod, periodDays, active)
 */
export function useUpdatePlan() {
  assertAddresses("HUB")
  const hub = ADDR.HUB as `0x${string}`
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  async function update(
    id: bigint,
    name: string,
    metadataURI: string,
    pricePerPeriod: bigint,
    periodDays: number,
    active: boolean
  ) {
    if (!address) throw new Error("Connect your wallet.")
    const c = client
    if (!c) throw new Error("Public client not initialized")

    try {
      await c.simulateContract({
        abi: CreatorHubAbi as any,
        address: hub,
        functionName: "updatePlan",
        args: [id, name.trim(), metadataURI.trim(), pricePerPeriod, periodDays, active],
        chain: base,
        account: address,
      })
    } catch (e) {
      throw new Error(toUserError(e, "Update would revert"))
    }

    try {
      const hash = await writeContractAsync({
        abi: CreatorHubAbi as any,
        address: hub,
        functionName: "updatePlan",
        args: [id, name.trim(), metadataURI.trim(), pricePerPeriod, periodDays, active],
        chain: base,
        account: address,
      })
      await c.waitForTransactionReceipt({ hash })
      return hash
    } catch (e) {
      throw new Error(toUserError(e))
    }
  }

  return { update, isPending, error }
}
