// app/providers.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode, useMemo } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  WagmiProvider,
  createConfig,
  createStorage,
  cookieStorage,
  http,
} from "wagmi";
import { base } from "viem/chains";
import { injected } from "wagmi/connectors";
import { coinbaseWallet } from "wagmi/connectors/coinbaseWallet";
import { walletConnect } from "wagmi/connectors/walletConnect";
import {
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import ChainGate from "@/components/ChainGate";

/** React Query: tuned defaults */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
});

/** Wagmi: Base-only, SSR-safe */
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
  },
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: "OnlyStars",
      preference: "smartWallet",
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
    }),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  autoConnect: true,
});

/** RainbowKit: premium dark with OnlyStars accent */
const rkTheme = darkTheme({
  accentColor: "#FF4ECD",
  accentColorForeground: "#0A0A0A",
  borderRadius: "large",
  overlayBlur: "small",
});

export default function Providers({ children }: { children: ReactNode }) {
  const cfg = useMemo(() => wagmiConfig, []);
  const theme = useMemo(() => rkTheme, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={cfg}>
        <RainbowKitProvider
          theme={theme}
          modalSize="compact"
          initialChain={base}
          appInfo={{ appName: "OnlyStars" }}
          showRecentTransactions
        >
          {/* GLOBAL Base-only guard.
              If you prefer per-page gating, remove ChainGate here
              and wrap only the pages that need it. */}
          <ChainGate>{children}</ChainGate>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
