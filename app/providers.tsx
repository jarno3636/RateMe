'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, http, fallback } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cut noisy refetching and help with RPC quotas
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Prefer env var, but fall back to the ID you provided.
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  'ecdaf8b76c0218e1e571cac6581aa7c4';

// Prefer Alchemy; gracefully fall back to Base public RPC
const baseTransport = fallback([
  http(process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || ''), // e.g. https://base-mainnet.g.alchemy.com/v2/KEY
  http('https://mainnet.base.org'),
]);

const config = getDefaultConfig({
  appName: 'Rate Me',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [base],
  transports: {
    [base.id]: baseTransport,
  },
  ssr: true,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={base}
          appInfo={{ appName: 'Rate Me' }}
          theme={darkTheme({
            accentColor: '#7c3aed', // violet
            borderRadius: 'large',
            overlayBlur: 'small',
          })}
          modalSize="compact"
          showRecentTransactions={false}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
