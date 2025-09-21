// /lib/wagmi.ts
import { createConfig, http, type CreateConnectorFn } from "wagmi"
import { base } from "viem/chains"
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors"

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID

// Build as CreateConnectorFn[] (wagmi v2)
const connectors: CreateConnectorFn[] = [
  injected(),
  coinbaseWallet({ appName: "OnlyStars", preference: "smartWalletOnly" }),
  ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
]

export const wagmiConfig = createConfig({
  chains: [base],
  connectors,
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) },
})
