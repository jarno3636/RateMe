// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let our public API pass through without auth
  if (pathname.startsWith("/api/top3")) {
    return NextResponse.next();
  }

  // ...your existing checks for other routes
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
