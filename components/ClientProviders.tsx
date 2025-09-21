// /components/ClientProviders.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { wagmiConfig } from "@/lib/wagmi";

const qc = new QueryClient();
const rkTheme = darkTheme({ accentColor: "#ec4899", accentColorForeground: "white" });

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider theme={rkTheme} initialChain={base} modalSize="compact" appInfo={{ appName: "OnlyStars" }}>
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
