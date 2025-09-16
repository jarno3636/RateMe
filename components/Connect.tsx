// /components/Connect.tsx
"use client"

import * as React from "react"
import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId, useConnectors } from "wagmi"

const BASE_CHAIN_ID = 8453

function truncate(addr?: string, left = 4, right = 4) {
  if (!addr) return ""
  return `${addr.slice(0, left)}…${addr.slice(-right)}`
}

export default function Connect({ compact = false }: { compact?: boolean }) {
  const { address, status, isConnected } = useAccount()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()
  const { connectAsync, isPending: isConnecting } = useConnect()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const connectors = useConnectors()

  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement | null>(null)

  // Close when clicking outside
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const label = isConnected ? truncate(address) : "Connect"
  const isWrongChain = isConnected && chainId !== BASE_CHAIN_ID

  const baseScanUrl = address ? `https://basescan.org/address/${address}` : "#"

  const connectWallet = async (id: string) => {
    try {
      const connector = connectors.find((c) => c.id === id) ?? connectors[0]
      if (!connector) return
      await connectAsync({ connector })
      setOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const copyAddr = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
    } catch {}
    setOpen(false)
  }

  const switchToBase = async () => {
    try {
      await switchChainAsync?.({ chainId: BASE_CHAIN_ID })
      setOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "group rounded-full px-4 py-2 text-sm transition",
          "border border-pink-500/50 hover:bg-pink-500/10",
          "max-w-[160px] truncate",
        ].join(" ")}
        title={isConnected ? address : "Connect wallet"}
      >
        {isConnected ? (
          <>
            {compact ? <span className="sm:hidden">CA</span> : null}
            <span className={compact ? "hidden sm:inline" : ""}>{label}</span>
          </>
        ) : (
          "Connect"
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-black/90 p-2 shadow-xl backdrop-blur"
          role="menu"
        >
          {!isConnected ? (
            <div className="space-y-1">
              {connectors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => connectWallet(c.id)}
                  disabled={isConnecting || !c.ready}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                >
                  <span className="truncate">
                    {c.name === "Injected" ? "Browser Wallet" : c.name}
                  </span>
                  {!c.ready ? (
                    <span className="text-xs opacity-60">Unavailable</span>
                  ) : null}
                </button>
              ))}
              {connectors.length === 0 && (
                <div className="rounded-xl px-3 py-2 text-sm opacity-70">
                  No wallets detected. Install MetaMask or use a wallet app.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {/* Address */}
              <div className="rounded-xl border border-white/10 px-3 py-2">
                <div className="truncate text-sm font-medium">{address}</div>
                <div className="text-xs opacity-60">
                  {isWrongChain ? "Wrong network" : "Connected"}
                </div>
              </div>

              {isWrongChain && (
                <button
                  onClick={switchToBase}
                  disabled={isSwitching}
                  className="w-full rounded-xl border border-pink-500/40 px-3 py-2 text-left text-sm hover:bg-pink-500/10 disabled:opacity-50"
                >
                  {isSwitching ? "Switching…" : "Switch to Base"}
                </button>
              )}

              <button
                onClick={copyAddr}
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                Copy address
              </button>

              <a
                href={baseScanUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                View on BaseScan
              </a>

              <button
                onClick={() => {
                  disconnect()
                  setOpen(false)
                }}
                className="w-full rounded-xl border border-white/10 px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
