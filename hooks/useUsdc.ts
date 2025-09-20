// /hooks/useUsdc.ts
"use client"

import type { Address } from "viem"            // ✅ type-only import
import { erc20Abi, maxUint256 } from "viem"
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi"
import { base } from "viem/chains"
import { USDC as USDC_ADDR } from "@/lib/addresses" // ✅ single source of truth

/* ----------------------------- Metadata ----------------------------- */

export function useUSDCMeta() {
  // We keep these reads disabled if USDC address isn't configured
  const has = !!USDC_ADDR
  const tokenAddr = has ? (USDC_ADDR as `0x${string}`) : undefined

  const { data: decimals = 6 } = useReadContract({
    abi: erc20Abi,
    address: tokenAddr,
    functionName: "decimals",
    query: { enabled: has },
  })
  const { data: symbol = "USDC" } = useReadContract({
    abi: erc20Abi,
    address: tokenAddr,
    functionName: "symbol",
    query: { enabled: has },
  })
  const { data: name = "USD Coin" } = useReadContract({
    abi: erc20Abi,
    address: tokenAddr,
    functionName: "name",
    query: { enabled: has },
  })
  return {
    address: tokenAddr,
    decimals: Number(decimals || 6),
    symbol: String(symbol || "USDC"),
    name: String(name || "USD Coin"),
  }
}

/* ----------------------------- Balance ----------------------------- */

export function useUSDCBalance(owner?: Address | `0x${string}`) {
  const enabled = !!USDC_ADDR && !!owner
  return useReadContract({
    abi: erc20Abi,
    address: enabled ? (USDC_ADDR as `0x${string}`) : undefined,
    functionName: "balanceOf",
    args: enabled ? [owner as `0x${string}`] : undefined,
    query: { enabled },
  })
}

/* ----------------------------- Allowance ----------------------------- */

export function useUSDCAllowance(spender?: Address | `0x${string}`) {
  const { address } = useAccount()
  const enabled = !!USDC_ADDR && !!address && !!spender

  return useReadContract({
    abi: erc20Abi,
    address: enabled ? (USDC_ADDR as `0x${string}`) : undefined,
    functionName: "allowance",
    args: enabled ? [address as `0x${string}`, spender as `0x${string}`] : undefined,
    query: { enabled },
  })
}

/* ----------------------------- Approve ----------------------------- */

export function useUSDCApprove() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  /**
   * Approve USDC for a spender. Defaults to max approval (gas-efficient for many UIs),
   * but you can pass an explicit amount when you want granular approvals (e.g., just fee).
   */
  const approve = async (spender: Address | `0x${string}`, amount: bigint = maxUint256) => {
    if (!USDC_ADDR) throw new Error("USDC contract address is not configured.")
    if (!address) throw new Error("Connect your wallet to approve USDC.")
    const c = client
    if (!c) throw new Error("Public client not initialized")

    const hash = await writeContractAsync({
      abi: erc20Abi,
      address: USDC_ADDR as `0x${string}`,
      functionName: "approve",
      args: [spender as `0x${string}`, amount],
      account: address,
      chain: base,
    })
    await c.waitForTransactionReceipt({ hash })
    return hash
  }

  return { approve, isPending, error }
}
