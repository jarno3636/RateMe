// /app/providers.tsx
"use client"

import React, { useRef } from "react"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit"
import { http } from "viem"
import { base } from "viem/chains"
import "@rainbow-me/rainbowkit/styles.css"

// Optional custom RPC (falls back to default if not set)
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL
// WalletConnect Project ID (set this in Vercel for WalletConnect to appear)
const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "ONLYSTARS"

const wagmiConfig = getDefaultConfig({
  appName: "OnlyStars",
  projectId: WC_PROJECT_ID,
  chains: [base],
  ssr: true,
  transports: { [base.id]: http(RPC_URL) }, // safe if RPC_URL is undefined
})

const theme = darkTheme({
  accentColor: "#ec4899",     // hot pink accent
  borderRadius: "large",
  overlayBlur: "small",
})

export default function Providers({ children }: { children: React.ReactNode }) {
  // keep a single QueryClient instance on the client
  const qcRef = useRef(new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qcRef.current}>
        <RainbowKitProvider
          theme={theme}
          initialChain={base}
          modalSize="compact"         // smaller, nicer on mobile
          showRecentTransactions={false}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
