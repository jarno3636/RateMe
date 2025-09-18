// middleware.ts
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Any “file.ext” path should skip the middleware
const PUBLIC_FILE = /\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|json|map|js|css)$/i

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1) Always let API routes through
  if (pathname.startsWith("/api/")) return NextResponse.next()

  // 2) Skip Next.js internals & static files
  if (pathname.startsWith("/_next")) return NextResponse.next()
  if (pathname === "/favicon.ico") return NextResponse.next()
  if (PUBLIC_FILE.test(pathname)) return NextResponse.next()

  // 3) (Optional) Add auth/guards here
  // if (!hasSessionCookie(req)) return NextResponse.redirect(new URL("/login", req.url))

  // 4) Default allow
  return NextResponse.next()
}

// Only run for app pages (not API/static)
export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|json|map|js|css)).*)",
  ],
}
