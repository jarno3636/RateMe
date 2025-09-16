// /components/Connect.tsx
"use client"

import * as React from "react"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"

function truncate(addr?: string, left = 4, right = 4) {
  if (!addr) return ""
  return `${addr.slice(0, left)}…${addr.slice(-right)}`
}

export default function Connect({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount()

  return (
    <ConnectButton.Custom>
      {({ openConnectModal, openAccountModal, mounted, account }) => {
        const ready = mounted
        const connected = ready && isConnected && !!account
        const label = connected ? truncate(address) : "Connect"
        return (
          <button
            onClick={connected ? openAccountModal : openConnectModal}
            className={[
              "group rounded-full px-3 py-1.5 text-xs transition",
              "border border-pink-500/50 hover:bg-pink-500/10",
              "max-w-[140px] truncate",
            ].join(" ")}
            title={connected ? address : "Connect wallet"}
          >
            {connected ? (
              <>
                {compact ? <span className="sm:hidden">CA</span> : null}
                <span className={compact ? "hidden sm:inline" : ""}>{label}</span>
              </>
            ) : (
              "Connect"
            )}
          </button>
        )
      }}
    </ConnectButton.Custom>
  )
}
