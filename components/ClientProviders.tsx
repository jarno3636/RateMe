// components/ClientProviders.tsx
'use client';

import { WagmiConfig, createConfig, cookieStorage, createStorage, http } from 'wagmi';
import { base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useMemo } from 'react';
import * as ADDR from '@/lib/addresses';

// If you use connectors that can run on the server, add them here.
// IMPORTANT: Avoid importing SDKs that touch IndexedDB at module scope.
import { injected } from 'wagmi/connectors';

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  // Prevent any server access to window/indexedDB by using cookie storage in SSR.
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  connectors: [
    injected({ shimDisconnect: true }),
    // If you want CoinbaseWallet / WalletConnect, add them, but they’re safe.
    // Do NOT import MetaMask SDK here (it uses IndexedDB); see note below.
  ],
});

export default function ClientProviders({ children }: { children: ReactNode }) {
  // memo to avoid re-creating on every render
  const cfg = useMemo(() => wagmiConfig, []);
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={cfg}>{children}</WagmiConfig>
    </QueryClientProvider>
  );
}
