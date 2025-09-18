// /hooks/useUsdc.ts
"use client"

import { Address, erc20Abi, maxUint256 } from "viem"
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi"
import { base } from "viem/chains"
import { USDC as USDC_ADDR } from "@/lib/addresses" // ✅ single source of truth

// Note: USDC_ADDR is `0x...` | undefined. We keep reads disabled if undefined.
export function useUSDCAllowance(spender?: Address) {
  const { address } = useAccount()
  const enabled = !!USDC_ADDR && !!address && !!spender

  return useReadContract({
    abi: erc20Abi,
    address: enabled ? (USDC_ADDR as Address) : undefined,
    functionName: "allowance",
    args: enabled ? [address as Address, spender as Address] : undefined,
    query: { enabled },
  })
}

export function useUSDCApprove() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  // approve and wait for receipt
  const approve = async (spender: Address, amount: bigint = maxUint256) => {
    if (!USDC_ADDR) throw new Error("USDC contract address is not configured.")
    if (!address) throw new Error("Connect your wallet to approve USDC.")
    const hash = await writeContractAsync({
      abi: erc20Abi,
      address: USDC_ADDR,
      functionName: "approve",
      args: [spender, amount],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { approve, isPending, error }
}
