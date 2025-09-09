// app/api/frame/route.ts
import { NextResponse, NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/** Resolve site URL once (no trailing slash) */
function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

/** Very light handle normalization */
function normalizeHandle(s: string) {
  return String(s || '').trim().replace(/^@/, '').toLowerCase()
}
function isValidHandle(h: string) {
  return !!h && h.length >= 3 && h.length <= 32 && /^[a-z0-9._-]+$/.test(h)
}

/** Build a tiny HTML document with Frame meta tags */
function frameHtml({
  image,
  postUrl,
  buttons,
  title = 'Rate Me — Frame',
  description = 'Creator subscriptions, paid posts, and ratings on Base.',
  inputText,
}: {
  image: string
  postUrl: string
  buttons: Array<{ label: string; action?: 'post' | 'link'; target?: string }>
  title?: string
  description?: string
  inputText?: string
}) {
  const site = siteUrl()
  const lines: string[] = [
    '<!doctype html><html><head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width" />',
    `<title>${title}</title>`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:url" content="${site}/" />`,

    // Frame vNext tags
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${image}" />`,
    `<meta property="fc:frame:post_url" content="${postUrl}" />`,
  ]

  if (inputText) {
    lines.push(`<meta property="fc:frame:input:text" content="${inputText}" />`)
  }

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
    `<b>Frame ready</b> — client will render from meta tags.`,
    '</body></html>'
  )
  return lines.join('\n')
}

/** Home (default) — now with input for handle */
function homeFrame() {
  const site = siteUrl()
  return frameHtml({
    image: `${site}/miniapp-card.png`,
    postUrl: `${site}/api/frame`,
    inputText: 'Enter @handle to preview',
    buttons: [
      { label: 'Preview Creator', action: 'post' }, // uses inputText
      { label: 'Top Creators', action: 'post' },
      { label: 'How it Works', action: 'post' },
    ],
    title: 'Rate Me — Frame',
  })
}

/** After user submits a handle */
function creatorFrame(handle: string) {
  const site = siteUrl()
  const safe = normalizeHandle(handle)
  const creatorUrl = `${site}/creator/${encodeURIComponent(safe)}`
  return frameHtml({
    image: `${site}/miniapp-card.png`, // could swap to a per-creator OG later
    postUrl: `${site}/api/frame`,
    buttons: [
      { label: 'Back', action: 'post' },
      { label: 'Open Creator', action: 'link', target: creatorUrl },
      { label: 'Open Mini App', action: 'link', target: `${site}/mini` },
    ],
    title: `@${safe} — Rate Me`,
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
      { label: 'Discover', action: 'link', target: `${site}/discover` },
      { label: 'Open Mini App', action: 'link', target: `${site}/mini` },
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
  // default view
  let screen: 'home' | 'creators' | 'how' | 'creator' = 'home'
  let submittedHandle = ''

  try {
    // Some frame hosts send multipart/form-data, some x-www-form-urlencoded
    const form = await req.formData()

    // Button index is 1-based in many clients
    const idxRaw =
      (form as any)?.get?.('buttonIndex') ??
      (form as any)?.get?.('index') ??
      0
    const idx = Number(idxRaw || 0)

    // Optional input field from the home screen
    const input = (form as any)?.get?.('inputText') ?? ''
    const maybeHandle = normalizeHandle(String(input || ''))

    // From the “home” screen:
    // 1 => Preview Creator (requires inputText)
    // 2 => Top Creators
    // 3 => How it Works
    if (idx === 2) screen = 'creators'
    else if (idx === 3) screen = 'how'
    else if (idx === 1 && isValidHandle(maybeHandle)) {
      screen = 'creator'
      submittedHandle = maybeHandle
    }
  } catch {
    // If parsing fails, stay on home
  }

  const html =
    screen === 'creators'
      ? creatorsFrame()
      : screen === 'how'
      ? howFrame()
      : screen === 'creator'
      ? creatorFrame(submittedHandle)
      : homeFrame()

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
