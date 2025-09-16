// /components/Connect.tsx
"use client"

import * as React from "react"
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId,
  useConnectors,
} from "wagmi"

const BASE_CHAIN_ID = 8453

function truncate(addr?: string, left = 4, right = 4) {
  if (!addr) return ""
  return `${addr.slice(0, left)}…${addr.slice(-right)}`
}

export default function Connect({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()
  const { connectAsync, isPending: isConnecting } = useConnect()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const connectors = useConnectors()

  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement | null>(null)

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

  // Show only distinct, ready connectors; hide Safe in navbar menu
  const ready = connectors
    .filter((c) => c.ready)
    .filter((c) => c.id !== "safe")
    // de-dupe multiple walletconnect items some providers expose
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)

  const hasAny = ready.length > 0

  const connectWallet = async (id: string) => {
    try {
      const connector = ready.find((c) => c.id === id) ?? ready[0]
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
          "group rounded-full px-3 py-1.5 text-xs transition",
          "border border-pink-500/50 hover:bg-pink-500/10",
          "max-w-[140px] truncate",
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
          className="absolute right-0 z-50 mt-2 w-56 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-black/95 p-1.5 text-xs shadow-xl backdrop-blur"
          role="menu"
        >
          {!isConnected ? (
            hasAny ? (
              <div className="space-y-1">
                {ready.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => connectWallet(c.id)}
                    disabled={isConnecting}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-50"
                  >
                    <span className="truncate">
                      {c.name === "Injected" ? "Browser Wallet" : c.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <a
                  className="block rounded-xl px-2.5 py-1.5 hover:bg-white/10"
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Install MetaMask
                </a>
                {/* WalletConnect only appears if configured in providers */}
                <span className="block rounded-xl px-2.5 py-1.5 opacity-60">
                  WalletConnect unavailable
                </span>
              </div>
            )
          ) : (
            <div className="space-y-1">
              <div className="rounded-xl border border-white/10 px-2.5 py-1.5">
                <div className="truncate font-medium">{address}</div>
                <div className="mt-0.5 text-[11px] opacity-60">
                  {isWrongChain ? "Wrong network" : "Connected"}
                </div>
              </div>

              {isWrongChain && (
                <button
                  onClick={switchToBase}
                  disabled={isSwitching}
                  className="w-full rounded-xl border border-pink-500/40 px-2.5 py-1.5 text-left hover:bg-pink-500/10 disabled:opacity-50"
                >
                  {isSwitching ? "Switching…" : "Switch to Base"}
                </button>
              )}

              <button
                onClick={copyAddr}
                className="w-full rounded-xl px-2.5 py-1.5 text-left hover:bg-white/10"
              >
                Copy address
              </button>

              <a
                href={baseScanUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-xl px-2.5 py-1.5 text-left hover:bg-white/10"
              >
                View on BaseScan
              </a>

              <button
                onClick={() => {
                  disconnect()
                  setOpen(false)
                }}
                className="w-full rounded-xl border border-white/10 px-2.5 py-1.5 text-left text-red-300 hover:bg-red-500/10"
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
