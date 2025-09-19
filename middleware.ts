// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Any “file.ext” path should skip the middleware
const PUBLIC_FILE = /\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|json|map|js|css)$/i;

// Env helpers
const IS_PROD = process.env.NODE_ENV === "production";
const SITE_ENV = (process.env.NEXT_PUBLIC_SITE_ENV || "").toLowerCase(); // "prod" | "staging" | etc.

// Domains allowed to embed our Farcaster MiniApp (/mini)
const FRAME_WHITELIST = [
  "https://warpcast.com",
  "https://*.warpcast.com",
];

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, search } = url;

  // 1) Always let API routes through
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // 2) Skip Next.js internals & static files
  if (pathname.startsWith("/_next")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();
  if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

  // 3) Production hardening: force HTTPS + strip leading "www."
  if (IS_PROD) {
    const isHttps = req.headers.get("x-forwarded-proto") === "https" || url.protocol === "https:";
    const isWww = url.host.startsWith("www.");

    if (!isHttps || isWww) {
      const host = isWww ? url.host.replace(/^www\./, "") : url.host;
      const redirectURL = new URL(url.toString());
      redirectURL.protocol = "https:";
      redirectURL.host = host;
      return NextResponse.redirect(redirectURL, 308);
    }
  }

  // 4) Path normalization
  // - collapse double slashes
  // - remove trailing slash (except root "/")
  let normalizedPath = pathname.replace(/\/{2,}/g, "/");
  if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  if (normalizedPath !== pathname) {
    const normalized = new URL(req.url);
    normalized.pathname = normalizedPath;
    return NextResponse.redirect(normalized, 308);
  }

  // 5) Build base response
  const res = NextResponse.next();

  // 6) Security headers (default)
  // Content-Security-Policy:
  // - Allow images/video/fonts from anywhere (you can tighten later)
  // - Allow scripts/styles from self (Next.js, analytics can be whitelisted if needed)
  // - Block framing by default; we override below for /mini
  const defaultCSP = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data: https:",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'", // inline for Next.js runtime; remove if you enforce nonce/hashes
    "style-src 'self' 'unsafe-inline'",  // Tailwind/inline critical styles
    "connect-src 'self' https: wss:",
    // frame-ancestors default → no embedding
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  // For Farcaster MiniApp pages, let Warpcast embed us in an iframe
  const isMini = pathname === "/mini" || pathname.startsWith("/mini/");
  const csp = isMini
    ? defaultCSP.replace("frame-ancestors 'none'", `frame-ancestors 'self' ${FRAME_WHITELIST.join(" ")}`)
    : defaultCSP;

  // Core headers
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-DNS-Prefetch-Control", "on");
  res.headers.set("Permissions-Policy", [
    "geolocation=()", "camera=()", "microphone=()",
    "payment=()", "usb=()", "bluetooth=()"
  ].join(", "));

  // 7) Robots: block non-prod from being indexed
  if (SITE_ENV && SITE_ENV !== "prod") {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  }

  return res;
}

// Only run for app pages (not API/static)
export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|json|map|js|css)).*)",
  ],
};
