// app/api/frame/route.ts
import { NextResponse, NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/** Resolve site URL once (no trailing slash) */
function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

/** Build a tiny HTML document with Frame meta tags */
function frameHtml({
  image,
  postUrl,
  buttons,
  title = 'Rate Me — Frame',
}: {
  image: string
  postUrl: string
  buttons: Array<{ label: string; action?: 'post' | 'link'; target?: string }>
  title?: string
}) {
  const site = siteUrl()
  const lines: string[] = [
    '<!doctype html><html><head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width" />',
    `<title>${title}</title>`,
    `<meta property="og:title" content="Rate Me" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:url" content="${site}/" />`,
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${image}" />`,
    `<meta property="fc:frame:post_url" content="${postUrl}" />`,
  ]

  buttons.forEach((b, i) => {
    const idx = i + 1
    lines.push(`<meta property="fc:frame:button:${idx}" content="${b.label}" />`)
    if (b.action) lines.push(`<meta property="fc:frame:button:${idx}:action" content="${b.action}" />`)
    if (b.action === 'link' && b.target)
      lines.push(`<meta property="fc:frame:button:${idx}:target" content="${b.target}" />`)
  })

  lines.push(
    '</head>',
    `<body style="font:14px system-ui;padding:24px;color:#e5e7eb;background:#0b1220">`,
    `<b>Frame OK</b> — Warpcast will read the meta tags above.`,
    '</body></html>'
  )
  return lines.join('\n')
}

/** Home screen (default) */
function homeFrame() {
  const site = siteUrl()
  return frameHtml({
    image: `${site}/miniapp-card.png`,
    postUrl: `${site}/api/frame`,
    buttons: [
      { label: 'Open Rate Me', action: 'post' },
      { label: 'Top Creators', action: 'post' },
      { label: 'How it Works', action: 'post' },
    ],
  })
}

/** Simple “creators” screen */
function creatorsFrame() {
  const site = siteUrl()
  return frameHtml({
    image: `${site}/miniapp-card.png`,
    postUrl: `${site}/api/frame`,
    buttons: [
      { label: 'Back', action: 'post' },
      { label: 'Open Mini App', action: 'link', target: `${site}/mini` },
      { label: 'Discover', action: 'link', target: `${site}/discover` },
    ],
    title: 'Rate Me — Creators',
  })
}

/** Simple “how it works” screen */
function howFrame() {
  const site = siteUrl()
  return frameHtml({
    image: `${site}/miniapp-card.png`,
    postUrl: `${site}/api/frame`,
    buttons: [
      { label: 'Back', action: 'post' },
      { label: 'Read Guide', action: 'link', target: `${site}/instructions` },
      { label: 'Launch as Creator', action: 'link', target: `${site}/creator` },
    ],
    title: 'Rate Me — How it Works',
  })
}

export async function GET(_req: NextRequest) {
  const html = homeFrame()
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export async function POST(req: NextRequest) {
  const site = siteUrl()

  // Safe parsing even when TS lib "dom" isn't present
  let screen: 'home' | 'creators' | 'how' = 'home'
  try {
    const form = await req.formData()
    const idxRaw = (form as any)?.get?.('buttonIndex') ?? (form as any)?.get?.('index') ?? 0
    const idx = Number(idxRaw || 0)

    // From the “home” screen:
    // 1 => Open Rate Me (we’ll show a screen with link buttons)
    // 2 => Top Creators
    // 3 => How it Works
    if (idx === 2) screen = 'creators'
    if (idx === 3) screen = 'how'
  } catch {
    // If parsing fails, stay on home
  }

  const html =
    screen === 'creators' ? creatorsFrame() : screen === 'how' ? howFrame() : homeFrame()

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      // X-FRAME-OPTIONS intentionally omitted for Frames
    },
  })
}
