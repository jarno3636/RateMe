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

const USDC = process.env.NEXT_PUBLIC_USDC as `0x${string}`

export function useUSDCAllowance(spender?: Address) {
  const { address } = useAccount()
  return useReadContract({
    abi: erc20Abi,
    address: USDC,
    functionName: "allowance",
    args: address && spender ? [address, spender] : undefined,
    query: { enabled: !!address && !!spender },
  })
}

export function useUSDCApprove() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  // approve and wait for receipt
  const approve = async (spender: Address, amount: bigint = maxUint256) => {
    if (!address) throw new Error("Connect your wallet to approve USDC.")
    const hash = await writeContractAsync({
      abi: erc20Abi,
      address: USDC,
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
