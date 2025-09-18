// /components/ClientProviders.tsx
'use client';

import { ReactNode, useRef, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  WagmiProvider,
  createConfig,
  createStorage,
  cookieStorage,
  http,
} from 'wagmi';
import { base } from 'viem/chains';

// RainbowKit (wagmi v2 compatible)
import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,
  darkTheme,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL;
const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'ONLYSTARS';

// Build RainbowKit connectors (no side effects; safe in client component)
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [injectedWallet, metaMaskWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  {
    appName: 'OnlyStars',
    projectId: WC_PROJECT_ID,
  }
);

// Minimal wagmi config, SSR-aware storage (cookies only)
const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(RPC_URL) },
  connectors,
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});

// Polished dark theme
const theme = darkTheme({
  accentColor: '#ec4899', // Tailwind pink-500
  overlayBlur: 'small',
  borderRadius: 'large',
});

export default function ClientProviders({ children }: { children: ReactNode }) {
  // Create the QueryClient once (avoids new instances on re-render/HMR)
  const qcRef = useRef(new QueryClient());
  const cfg = useMemo(() => wagmiConfig, []);

  return (
    <WagmiProvider config={cfg}>
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
  );
}
