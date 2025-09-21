// /lib/wagmi.ts
import { createConfig, http, type CreateConnectorFn } from "wagmi";
import { base } from "viem/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || undefined;
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// Build connectors (wagmi v2). Note: valid coinbase preference: "all" | "wallet" | "smartWallet"
const connectors: CreateConnectorFn[] = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: "OnlyStars", preference: "all" }),
  ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
];

export const wagmiConfig = createConfig({
  chains: [base],
  connectors,
  transports: { [base.id]: http(rpcUrl) },
  // storage is added in the client provider (cookieStorage) for SSR safety
});
