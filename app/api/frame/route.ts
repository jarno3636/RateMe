import { NextResponse, NextRequest } from 'next/server'
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const html = `<!doctype html><html><head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Rate Me — Frame</title>
    <meta property="og:title" content="Rate Me" />
    <meta property="og:image" content="${site}/miniapp-card.png" />
    <meta property="og:url" content="${site}/" />
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${site}/miniapp-card.png" />
    <meta property="fc:frame:post_url" content="${site}/api/frame" />
    <meta property="fc:frame:button:1" content="Open Rate Me" />
    <meta property="fc:frame:button:1:action" content="post" />
  </head><body style="font:14px system-ui;padding:24px;color:#e5e7eb;background:#0b1220">
    <b>Frame OK</b> — Warpcast will read the meta tags above.
  </body></html>`
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
