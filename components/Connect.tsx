// /components/Connect.tsx
"use client"

import * as React from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { base } from "viem/chains"

function truncate(addr?: string, left = 4, right = 4) {
  if (!addr) return ""
  return `${addr.slice(0, left)}…${addr.slice(-right)}`
}

export default function Connect({ compact = false }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({
        openConnectModal,
        openAccountModal,
        openChainModal,
        mounted,
        account,
        chain,
      }) => {
        // Hydration safety: hide until RainbowKit mounts
        const ready = mounted
        const connected = ready && !!account?.address
        const onBase = connected && chain?.id === base.id && !chain?.unsupported

        const address = account?.address
        const label = connected ? truncate(address) : "Connect"

        // Decide intent & click
        const showSwitch = connected && !onBase
        const onClick = showSwitch
          ? openChainModal
          : connected
          ? openAccountModal
          : openConnectModal

        // Button text logic (compact keeps things tidy on small screens)
        const text = showSwitch
          ? "Switch to Base"
          : connected
          ? compact
            ? (
              <>
                <span className="sm:hidden">Acct</span>
                <span className="hidden sm:inline">{label}</span>
              </>
            )
            : label
          : "Connect"

        // Accessibility & SSR style guard
        const styleGuard: React.CSSProperties = ready
          ? {}
          : { opacity: 0, pointerEvents: "none" }

        const title = showSwitch
          ? "Wrong network — switch to Base"
          : connected
          ? address
          : "Connect wallet"

        return (
          <button
            type="button"
            onClick={onClick}
            aria-hidden={!ready}
            aria-busy={!ready}
            title={title}
            aria-label={
              showSwitch
                ? "Switch to Base network"
                : connected
                ? `Wallet ${label}`
                : "Connect wallet"
            }
            style={styleGuard}
            className={[
              "group inline-flex max-w-[180px] items-center justify-center gap-1",
              "truncate rounded-full px-3 py-1.5 text-xs transition",
              showSwitch
                ? "border border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/20"
                : "border border-pink-500/50 hover:bg-pink-500/10",
              "focus:outline-none focus:ring-2 focus:ring-pink-500/50",
            ].join(" ")}
          >
            {/* Leading dot as a subtle status indicator */}
            <span
              aria-hidden
              className={[
                "block h-2 w-2 rounded-full",
                showSwitch
                  ? "bg-amber-400"
                  : connected
                  ? "bg-pink-400"
                  : "bg-white/70",
              ].join(" ")}
            />
            <span className="truncate">
              {text}
            </span>
          </button>
        )
      }}
    </ConnectButton.Custom>
  )
}
