// /components/WagmiDebug.tsx
"use client";
import { useEffect } from "react";
import { getConnectors } from "wagmi/actions";

export default function WagmiDebug() {
  useEffect(() => {
    const cs = getConnectors();
    console.log("Connectors:", cs.map(c => c.id)); // expect ["injected","coinbaseWallet","walletConnect"]
    console.log("WC_PROJECT_ID:", process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);
  }, []);
  return null;
}
