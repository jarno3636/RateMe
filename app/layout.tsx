// /app/layout.tsx
import "./globals.css"
import Providers from "./providers"
import Nav from "@/components/Nav"
import { Toaster } from "react-hot-toast"

export const metadata = {
  title: "OnlyStars",
  description: "Creator subscriptions + paid posts + on-chain ratings (Base + USDC)",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Providers>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </Providers>
      </body>
    </html>
  )
}
