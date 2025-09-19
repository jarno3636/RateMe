// /app/providers.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { useMemo } from "react";
import type { ReactNode } from "react"; // ← type-only import fixes the error
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  createConfig,
  createStorage,
  cookieStorage,
  http,
  useAccount,
  useChainId,
} from "wagmi";
import { base } from "viem/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import {
  RainbowKitProvider,
  darkTheme,
  useChainModal,
  useConnectModal,
} from "@rainbow-me/rainbowkit";

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

/* ───────────────────────── Connectors (guarded) ───────────────── */
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: "OnlyStars", preference: "all" }),
  ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
];

/* ───────────────────────── Wagmi config ───────────────────────── */
const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(rpcUrl) },
  connectors,
  storage: createStorage({ storage: cookieStorage }), // SSR-safe persistence
  ssr: true,
  autoConnect: true,
});

/* ───────────────────────── RainbowKit theme ───────────────────── */
const rkTheme = darkTheme({
  accentColor: "#ec4899", // pink-500
  accentColorForeground: "white",
  borderRadius: "large",
  overlayBlur: "small",
});

/* ───────────────────────── Base-only soft gate ────────────────── */
function ChainGate({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const onBase = chainId === base.id;

  return (
    <>
      {children}
      <div
        aria-live="polite"
        className={[
          "pointer-events-none fixed inset-x-0 bottom-2 z-[9999] flex justify-center px-2",
          onBase ? "hidden" : "",
        ].join(" ")}
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/70 px-3 py-1.5 text-xs text-amber-200 backdrop-blur">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden />
          {isConnected ? (
            <>
              <span>Wrong network — switch to Base</span>
              <button
                onClick={openChainModal}
                className="rounded-full border border-amber-400/50 px-2 py-0.5 text-amber-100 hover:bg-amber-400/10 focus:outline-none focus:ring-1 focus:ring-amber-400/60"
              >
                Switch
              </button>
            </>
          ) : (
            <>
              <span>Connect your wallet to continue</span>
              <button
                onClick={openConnectModal}
                className="rounded-full border border-amber-400/50 px-2 py-0.5 text-amber-100 hover:bg-amber-400/10 focus:outline-none focus:ring-1 focus:ring-amber-400/60"
              >
                Connect
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Providers root ─────────────────────── */
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
        >
          <ChainGate>{children}</ChainGate>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
