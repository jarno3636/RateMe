// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Optional: a quick static file check (useful if you expand the matcher)
const PUBLIC_FILE = /\.(.*)$/

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Let ALL API routes pass through without auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 2) Skip static files just in case
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 3) Your auth/guard logic for app pages goes here
  // e.g. if (!hasSessionCookie(req)) return NextResponse.redirect(new URL("/login", req.url))

  // 4) Default: allow
  return NextResponse.next();
}

// Only run middleware for real app pages, not api/static
export const config = {
  matcher: [
    // everything except _next, static files, and /api
    "/((?!api|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml)).*)",
  ],
};
