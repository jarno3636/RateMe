// /lib/wagmi.ts
import { createConfig, http } from "wagmi"
import { base } from "viem/chains"
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors"

const connectors = [
  injected(),
  coinbaseWallet({ appName: "OnlyStars", preference: "smartWallet" }),
]

// Only add WalletConnect if a projectId is set (avoids build-time env issues)
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID
if (wcProjectId) {
  connectors.push(walletConnect({ projectId: wcProjectId }))
}

export const wagmiConfig = createConfig({
  chains: [base],
  connectors,
  // If NEXT_PUBLIC_BASE_RPC_URL is undefined, viem's http() uses chain defaults.
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) },
})
