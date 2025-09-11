// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Match /creator/@<handle> (optional trailing slash)
  const match = pathname.match(/^\/creator\/@([^/]+)\/?$/);
  if (match) {
    const handle = match[1];
    const url = req.nextUrl.clone();
    url.pathname = `/creator/resolve/${encodeURIComponent(handle)}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

// We’ll only inspect requests under /creator to keep things fast.
export const config = {
  matcher: ['/creator/:path*'],
};
