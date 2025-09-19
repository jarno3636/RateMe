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

/* ───────────────────────── React Query ───────────────────────── */
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

/* ───────────────────────── RPC transport ─────────────────────── */
const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
if (!rpcUrl) {
  // Safe to warn on the client; viem will fall back to a default, but it’s rate-limited.
  // Prefer setting NEXT_PUBLIC_BASE_RPC_URL to an Alchemy/QuickNode/etc. endpoint.
  console.warn("[providers] NEXT_PUBLIC_BASE_RPC_URL not set; using viem default (rate-limited).");
}

/* ───────────────────────── Connectors (guarded) ───────────────── */
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID;
const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({
    appName: "OnlyStars",
    preference: "smartWallet",
  }),
  // Only add WalletConnect if a project id is provided, so we don't crash in local dev.
  ...(wcProjectId
    ? [walletConnect({ projectId: wcProjectId })]
    : (console.warn("[providers] NEXT_PUBLIC_WALLETCONNECT_ID not set; WalletConnect disabled."), [])),
];

/* ───────────────────────── Wagmi config ───────────────────────── */
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(rpcUrl),
  },
  connectors,
  storage: createStorage({
    storage: cookieStorage, // SSR-safe persistence
  }),
  ssr: true,
  autoConnect: true,
});

/* ───────────────────────── RainbowKit theme ───────────────────── */
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
          initialChain={base}
          modalSize="compact"
          appInfo={{ appName: "OnlyStars" }}
          showRecentTransactions
        >
          {/* Global Base-only guard. Remove here and wrap specific pages if you prefer per-route gating. */}
          <ChainGate>{children}</ChainGate>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
