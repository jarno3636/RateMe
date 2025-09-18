import "./globals.css"
import dynamic from "next/dynamic"
import Nav from "@/components/Nav"
import { Toaster } from "react-hot-toast"

// Import the client Providers without SSR so nothing tries to touch indexedDB on the server
const ProvidersNoSSR = dynamic(() => import("./providers"), { ssr: false })

export const metadata = {
  title: "OnlyStars",
  description: "Creator subscriptions + paid posts + on-chain ratings (Base + USDC)",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        {/* Everything that touches wagmi/rainbowkit lives under the no-SSR provider */}
        <ProvidersNoSSR>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </ProvidersNoSSR>
      </body>
    </html>
  )
}
