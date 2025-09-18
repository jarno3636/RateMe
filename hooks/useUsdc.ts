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
import { USDC as USDC_ADDR } from "@/lib/addresses"   // ✅ normalized, checksummed

export function useUSDCAllowance(spender?: Address) {
  const { address } = useAccount()
  const enabled = !!address && !!spender && !!USDC_ADDR

  return useReadContract({
    abi: erc20Abi,
    address: USDC_ADDR,             // ✅ only call if valid
    functionName: "allowance",
    args: enabled ? [address!, spender!] : undefined,
    query: { enabled },
  })
}

export function useUSDCApprove() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const approve = async (spender: Address, amount: bigint = maxUint256) => {
    if (!USDC_ADDR) throw new Error("USDC contract address is not configured.")
    if (!address) throw new Error("Connect your wallet to approve USDC.")

    const hash = await writeContractAsync({
      abi: erc20Abi,
      address: USDC_ADDR,          // ✅ normalized address
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
