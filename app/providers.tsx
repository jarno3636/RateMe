// /app/providers.tsx
"use client"

import React, { useRef } from "react"
import { WagmiProvider, createConfig, cookieStorage, createStorage, http } from "wagmi"
import { base } from "viem/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  RainbowKitProvider,
  connectorsForWallets,
  darkTheme,
  wallet,
} from "@rainbow-me/rainbowkit"
import "@rainbow-me/rainbowkit/styles.css"

// ---- envs ----
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "ONLYSTARS"

// ---- RainbowKit connectors (no sdk that touches indexedDB) ----
const connectors = connectorsForWallets([
  {
    groupName: "Recommended",
    wallets: [
      wallet.injected({ shimDisconnect: true }),
      wallet.walletConnect({ projectId: WC_PROJECT_ID }),
      wallet.coinbase({ appName: "OnlyStars" }),
    ],
  },
])

// ---- Wagmi config with cookie storage (SSR-safe) ----
const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(RPC_URL) },
  ssr: true,
  connectors,
  storage: createStorage({ storage: cookieStorage }),
})

// ---- Theme ----
const theme = darkTheme({
  accentColor: "#ec4899", // hot pink
  borderRadius: "large",
  overlayBlur: "small",
})

export default function Providers({ children }: { children: React.ReactNode }) {
  const qcRef = useRef(new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qcRef.current}>
        <RainbowKitProvider theme={theme} initialChain={base} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
