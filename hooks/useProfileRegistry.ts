// /app/layout.tsx
import "./globals.css"
import Providers from "./providers"
import Nav from "@/components/Nav"

export const metadata = {
  title: "OnlyStars",
  description: "Creator subscriptions + paid posts + on-chain ratings (Base + USDC)",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {/* Global navigation bar */}
          <Nav />
          {/* Main container for page content */}
          <main className="container py-8">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
