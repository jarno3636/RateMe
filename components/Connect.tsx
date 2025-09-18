// /components/Connect.tsx
"use client"

import * as React from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"

function truncate(addr?: string, left = 4, right = 4) {
  if (!addr) return ""
  return `${addr.slice(0, left)}…${addr.slice(-right)}`
}

export default function Connect({ compact = false }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal, openAccountModal, mounted, account }) => {
        // Avoid SSR hydration issues until mounted
        const ready = mounted
        const connected = ready && !!account?.address
        const address = account?.address
        const label = connected ? truncate(address) : "Connect"

        return (
          <button
            type="button"
            onClick={connected ? openAccountModal : openConnectModal}
            // Prevent interaction / visual mismatch pre-mount
            aria-hidden={!ready}
            style={{ opacity: ready ? 1 : 0, pointerEvents: ready ? "auto" : "none" }}
            className={[
              "group rounded-full px-3 py-1.5 text-xs transition",
              "border border-pink-500/50 hover:bg-pink-500/10",
              "max-w-[160px] truncate",
              "focus:outline-none focus:ring-2 focus:ring-pink-500/50",
            ].join(" ")}
            title={connected ? address : "Connect wallet"}
            aria-label={connected ? `Wallet ${label}` : "Connect wallet"}
          >
            {connected ? (
              <>
                {compact ? (
                  // ultra-compact on small screens; show full truncated on >=sm
                  <>
                    <span className="sm:hidden">Acct</span>
                    <span className="hidden sm:inline">{label}</span>
                  </>
                ) : (
                  <span>{label}</span>
                )}
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
