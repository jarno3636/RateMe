// /components/Connect.tsx
"use client"

import * as React from "react"
import { useAccount } from "wagmi"

let RK: any
try {
  RK = require("@rainbow-me/rainbowkit")
} catch {
  // RainbowKit not available (fallback to a disabled button)
}

function truncate(addr: string, left = 4, right = 4) {
  if (!addr) return ""
  return `${addr.slice(0, left)}…${addr.slice(-right)}`
}

export default function Connect({ compact = false }: { compact?: boolean }) {
  const { address, status } = useAccount()
  const connected = status === "connected" && !!address

  // Fallback if RainbowKit is not installed
  if (!RK?.ConnectButton?.Custom) {
    return (
      <button
        className="rounded-full border border-pink-500/50 px-4 py-2 text-sm opacity-80"
        disabled
        title="Connect wallet"
      >
        {connected ? truncate(address!) : "Connect"}
      </button>
    )
  }

  return (
    <RK.ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
        const ready = mounted
        const isConnected = ready && account && chain
        const label = isConnected ? truncate(account.address) : "Connect"

        return (
          <button
            onClick={isConnected ? openAccountModal : openConnectModal}
            className={[
              "group rounded-full px-4 py-2 text-sm transition",
              "border border-pink-500/50 hover:bg-pink-500/10",
              "max-w-[160px] truncate",
            ].join(" ")}
            title={isConnected ? account.address : "Connect wallet"}
          >
            {/* Compact mode shows 'CA' on xs, address on sm+ */}
            {isConnected ? (
              <>
                {compact ? (
                  <span className="sm:hidden">CA</span>
                ) : null}
                <span className={compact ? "hidden sm:inline" : ""}>
                  {label}
                </span>
              </>
            ) : (
              "Connect"
            )}
          </button>
        )
      }}
    </RK.ConnectButton.Custom>
  )
}
