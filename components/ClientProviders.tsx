// /components/ClientProviders.tsx
"use client"

import "@rainbow-me/rainbowkit/styles.css"
import { ReactNode, useMemo } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  WagmiProvider,
  createConfig,
  createStorage,
  cookieStorage,
  http,
  useAccount,
  useChainId,
} from "wagmi"
import { base } from "viem/chains"
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors"
import { RainbowKitProvider, darkTheme, useChainModal, useConnectModal } from "@rainbow-me/rainbowkit"
import { Toaster } from "sonner" // ✨ global toast UI

/* ───────────────────────── React Query ───────────────────────── */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 20_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

/* ───────────────────────── Wagmi Config ───────────────────────── */
const WC_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
const CB_APP_NAME = process.env.NEXT_PUBLIC_COINBASE_APP_NAME || "OnlyStars"

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: CB_APP_NAME, preference: "all" }),
  ...(WC_ID ? [walletConnect({ projectId: WC_ID })] : []),
]

const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) },
  connectors,
  storage: createStorage({ storage: cookieStorage }),
  ssr: true, // hydration-safe
})

/* ───────────────────────── Chain Gate (soft) ─────────────────────────
   Non-blocking banner prompting users to connect or switch to Base.
--------------------------------------------------------------------- */
function ChainGate({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { openConnectModal } = useConnectModal()
  const { openChainModal } = useChainModal()
  const onBase = chainId === base.id

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
  )
}

/* ───────────────────────── Providers ───────────────────────── */
export default function ClientProviders({ children }: { children: ReactNode }) {
  const cfg = useMemo(() => wagmiConfig, [])
  const theme = useMemo(
    () =>
      darkTheme({
        accentColor: "#ec4899", // pink-500
        accentColorForeground: "white",
        borderRadius: "large",
        overlayBlur: "small",
      }),
    []
  )

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={cfg}>
        <RainbowKitProvider
          theme={theme}
          initialChain={base}
          modalSize="compact"
          appInfo={{ appName: "OnlyStars", learnMoreUrl: "https://base.org" }}
          coolMode
        >
          {/* ✨ Global toast host: use `import { toast } from "sonner"` from any component */}
          <Toaster
            position="bottom-center"
            richColors
            expand
            closeButton
            toastOptions={{
              classNames: {
                toast: "border border-white/10 bg-black/80 backdrop-blur",
                title: "text-white",
                description: "text-white/80",
                actionButton: "bg-pink-600 hover:bg-pink-500",
                cancelButton: "bg-zinc-700 hover:bg-zinc-600",
              },
            }}
          />
          <ChainGate>{children}</ChainGate>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
