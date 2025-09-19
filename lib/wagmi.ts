// /lib/wagmi.ts
import { http, createConfig } from "wagmi"
import { base } from "viem/chains"
import { injected } from "wagmi/connectors"
import { coinbaseWallet } from "wagmi/connectors/coinbaseWallet"
import { walletConnect } from "wagmi/connectors/walletConnect"

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "OnlyStars", preference: "smartWallet" }),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID! }),
  ],
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) },
})
