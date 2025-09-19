// /components/ChainGate.tsx
"use client"

import { ReactNode } from "react"
import { base } from "viem/chains"
import { useAccount, useSwitchChain } from "wagmi"

export default function ChainGate({ children }: { children: ReactNode }) {
  const { chain } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  if (chain && chain.id !== base.id) {
    return (
      <div className="p-4 rounded-xl border border-yellow-400 bg-yellow-50 text-yellow-900 space-y-2">
        <div className="font-medium">You’re on the wrong network</div>
        <div className="text-sm opacity-80">Please switch to Base to continue.</div>
        <button
          className="btn btn-primary"
          onClick={() => switchChain({ chainId: base.id })}
          disabled={isPending}
        >
          {isPending ? "Switching…" : "Switch to Base"}
        </button>
      </div>
    )
  }
  return <>{children}</>
}
