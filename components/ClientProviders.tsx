// /components/ClientProviders.tsx
'use client';

import { ReactNode, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  WagmiProvider,            // v2
  createConfig,             // v2
  createStorage,            // v2
  cookieStorage,            // v2
  http,                     // v2
} from 'wagmi';
import { base } from 'viem/chains';
import { injected } from 'wagmi/connectors'; // v2 connector

const queryClient = new QueryClient();

// Minimal, SSR-safe wagmi config (no IndexedDB on the server)
const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) },
  connectors: [
    injected({ shimDisconnect: true }),
    // Add more later if needed (WalletConnect/Coinbase), but keep them client-safe.
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});

export default function ClientProviders({ children }: { children: ReactNode }) {
  const cfg = useMemo(() => wagmiConfig, []);
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={cfg}>{children}</WagmiProvider>
    </QueryClientProvider>
  );
}
