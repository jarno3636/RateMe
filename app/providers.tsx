// app/providers.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  createConfig,
  createStorage,
  cookieStorage,
  http,
} from "wagmi";
import { base } from "viem/chains";
import { injected } from "wagmi/connectors";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) },
  connectors: [injected({ shimDisconnect: true })],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true, // SSR-safe
});

export default function Providers({ children }: { children: ReactNode }) {
  const cfg = useMemo(() => wagmiConfig, []);
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={cfg}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
