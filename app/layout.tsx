// /app/layout.tsx
import "./globals.css"
import dynamic from "next/dynamic"
import Nav from "@/components/Nav"
import { Toaster } from "react-hot-toast"
import type { Metadata, Viewport } from "next"

// ✅ Use the client-only providers you created
const ProvidersNoSSR = dynamic(() => import("@/components/ClientProviders"), { ssr: false })

export const metadata: Metadata = {
  title: "OnlyStars",
  description: "Creator subscriptions + paid posts + on-chain ratings (Base + USDC)",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
  ],
  openGraph: {
    title: "OnlyStars",
    description: "Creator subscriptions + paid posts + on-chain ratings (Base + USDC)",
    url: "https://onlystars.app",
    siteName: "OnlyStars",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OnlyStars" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OnlyStars",
    description: "Creator subscriptions + paid posts + on-chain ratings (Base + USDC)",
    images: ["/og.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* ✅ Preload the fallback avatar so all avatars swap instantly */}
        <link rel="preload" as="image" href="/avatar.png" />
      </head>
      <body className="min-h-full bg-black text-white antialiased">
        {/* Everything that touches wagmi lives under the no-SSR provider */}
        <ProvidersNoSSR>
          <Nav />
          <main id="main" className="mx-auto max-w-5xl px-4 py-8">
            {children}
          </main>
          {/* Premium toast styling (keeps out of the way on mobile) */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: "rgba(20,20,20,0.9)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" },
            }}
          />
        </ProvidersNoSSR>
        <noscript>
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "black",
              color: "white",
            }}
          >
            This app works best with JavaScript enabled.
          </div>
        </noscript>
      </body>
    </html>
  )
}
