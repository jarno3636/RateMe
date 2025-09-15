// /hooks/useUsdc.ts
"use client"

import { Address, erc20Abi, maxUint256 } from "viem"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"

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
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })
  return {
    approve: (spender: Address, amount: bigint = maxUint256) =>
      writeContract({
        abi: erc20Abi,
        address: USDC,
        functionName: "approve",
        args: [spender, amount],
      }),
    hash, isPending, wait, error,
  }
}
