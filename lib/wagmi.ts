// /lib/wagmi.ts
import { createConfig, http, type Connector } from "wagmi"
import { base } from "viem/chains"
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors"

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID

const connectors: Connector[] = [
  injected(),
  // Use 'smartWalletOnly' (or 'eoaOnly' / 'all')
  coinbaseWallet({ appName: "OnlyStars", preference: "smartWalletOnly" }),
  ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
]

export const wagmiConfig = createConfig({
  chains: [base],
  connectors,
  // If NEXT_PUBLIC_BASE_RPC_URL is undefined, viem's http() uses chain defaults.
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) },
})
