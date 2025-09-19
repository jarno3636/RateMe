// /hooks/useSpendApproval.ts
"use client"

import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi"
import { base } from "viem/chains"
import { erc20Abi, maxUint256 } from "viem"
import { REGISTRY as REGISTRY_ADDR, USDC as USDC_ADDR } from "@/lib/addresses"

export function useUsdcAllowance(ownerOverride?: `0x${string}`) {
  const { address } = useAccount()
  const owner = (ownerOverride ?? address) as `0x${string}` | undefined
  const enabled = !!owner && !!USDC_ADDR && !!REGISTRY_ADDR

  return useReadContract({
    abi: erc20Abi,
    address: USDC_ADDR,
    functionName: "allowance",
    args: enabled ? [owner!, REGISTRY_ADDR] : undefined,
    query: { enabled },
  })
}

export function useApproveUsdc() {
  const { address } = useAccount()
  const client = usePublicClient()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const approve = async (amount?: bigint) => {
    if (!address) throw new Error("Connect your wallet.")
    const hash = await writeContractAsync({
      abi: erc20Abi,
      address: USDC_ADDR,
      functionName: "approve",
      args: [REGISTRY_ADDR, amount ?? maxUint256],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { approve, isPending, error }
}
