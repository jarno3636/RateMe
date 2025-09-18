// /app/providers.tsx
"use client"

import React, { useRef } from "react"
import { WagmiProvider, createConfig, cookieStorage, createStorage, http } from "wagmi"
import { base } from "viem/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, connectorsForWallets, darkTheme } from "@rainbow-me/rainbowkit"
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets"
import "@rainbow-me/rainbowkit/styles.css"

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "ONLYSTARS" // replace in prod

// Pass wallet *creators* (no parentheses) and give shared options in 2nd arg
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, metaMaskWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  {
    appName: "OnlyStars",
    projectId: WC_PROJECT_ID,
  }
)

const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(RPC_URL) },
  connectors,
  ssr: true,
  // Cookie storage = SSR-safe (prevents `indexedDB is not defined` on server)
  storage: createStorage({ storage: cookieStorage }),
})

const theme = darkTheme({
  accentColor: "#ec4899",
  borderRadius: "large",
  overlayBlur: "small",
})

export default function Providers({ children }: { children: React.ReactNode }) {
  const qcRef = useRef(new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qcRef.current}>
        <RainbowKitProvider
          theme={theme}
          initialChain={base}
          modalSize="compact"
          showRecentTransactions={false}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
