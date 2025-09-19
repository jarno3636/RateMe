// /app/layout.tsx
import "./globals.css";
import dynamic from "next/dynamic";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import { Toaster } from "react-hot-toast";
import { SITE } from "@/lib/farcaster";

// Client-only providers (wagmi/RainbowKit live here)
const ProvidersNoSSR = dynamic(() => import("@/components/ClientProviders"), {
  ssr: false,
  loading: () => null,
});

/* ────────────────────────── Metadata ────────────────────────── */

const title = "OnlyStars";
const description =
  "Creator subscriptions + paid posts + on-chain ratings (Base + USDC)";
const ogImage = `${SITE}/og.png`;
const icon = "/favicon.ico";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title,
  description,
  alternates: {
    canonical: SITE,
  },
  icons: [
    { rel: "icon", url: icon },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
    { rel: "manifest", url: "/site.webmanifest" },
    // Safari pinned tab (optional—add /safari-pinned-tab.svg to public/)
    { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#ff4ecd" },
  ],
  openGraph: {
    title,
    description,
    url: SITE,
    siteName: title,
    images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
  // Basic robots; adjust if you add gated pages you don’t want indexed
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

function JsonLd() {
  // Simple Organization schema (expand later with creator pages if desired)
  const json = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OnlyStars",
    url: SITE,
    logo: `${SITE}/icon-192.png`,
    sameAs: ["https://warpcast.com/", "https://twitter.com/"],
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Optional perf: preconnect to your RPC host if set
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
  let rpcOrigin: string | null = null;
  try {
    if (rpcUrl) rpcOrigin = new URL(rpcUrl).origin;
  } catch {
    rpcOrigin = null;
  }

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Preload fallback avatar so all avatars swap instantly */}
        <link rel="preload" as="image" href="/avatar.png" />
        {/* Optional: preconnect to RPC to shave a few ms off first calls */}
        {rpcOrigin ? <link rel="preconnect" href={rpcOrigin} crossOrigin="" /> : null}
        {/* iOS nice-to-have */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <JsonLd />
      </head>
      <body className="min-h-full bg-black text-white antialiased">
        {/* Everything that touches wagmi lives under the client-only provider */}
        <ProvidersNoSSR>
          <Nav />
          <main id="main" className="mx-auto max-w-5xl px-4 py-8">
            {children}
          </main>

          {/* Premium toast styling (subtle, non-blocking) */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "rgba(20,20,20,0.92)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
              },
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
              fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            }}
          >
            This app works best with JavaScript enabled.
          </div>
        </noscript>
      </body>
    </html>
  );
}
