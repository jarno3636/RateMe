// app/api/frame/route.ts
import { NextResponse, NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

type Screen = 'home' | 'creators' | 'how';

/** Helper to render a Frame vNext HTML document with meta tags */
function renderFrame(screen: Screen = 'home') {
  const title = 'Rate Me — Creator subscriptions & paid posts on Base';

  // You can swap images per screen if you like.
  const image =
    screen === 'creators'
      ? `${SITE}/miniapp-card.png`
      : screen === 'how'
      ? `${SITE}/miniapp-card.png`
      : `${SITE}/miniapp-card.png`;

  // Buttons differ a bit by screen. We mix `post` (for in-frame navigation)
  // and `link` (to open your app/site).
  let buttonMeta = '';
  switch (screen) {
    case 'home': {
      buttonMeta = [
        // 1: Open Mini App (link)
        ['fc:frame:button:1', 'Open Mini App'],
        ['fc:frame:button:1:action', 'link'],
        ['fc:frame:button:1:target', `${SITE}/mini`],

        // 2: Top Creators (post → switches screen server-side)
        ['fc:frame:button:2', 'Top Creators'],
        ['fc:frame:button:2:action', 'post'],

        // 3: How it Works (post → switches screen server-side)
        ['fc:frame:button:3', 'How it Works'],
        ['fc:frame:button:3:action', 'post'],

        // 4: Visit Website (link)
        ['fc:frame:button:4', 'Visit Website'],
        ['fc:frame:button:4:action', 'link'],
        ['fc:frame:button:4:target', SITE],
      ]
        .map(([k, v]) => `<meta property="${k}" content="${v}" />`)
        .join('\n');
      break;
    }
    case 'creators': {
      buttonMeta = [
        ['fc:frame:button:1', 'Open Mini App'],
        ['fc:frame:button:1:action', 'link'],
        ['fc:frame:button:1:target', `${SITE}/mini`],

        ['fc:frame:button:2', 'Back'],
        ['fc:frame:button:2:action', 'post'],

        ['fc:frame:button:3', 'Discover on Web'],
        ['fc:frame:button:3:action', 'link'],
        ['fc:frame:button:3:target', `${SITE}/discover`],
      ]
        .map(([k, v]) => `<meta property="${k}" content="${v}" />`)
        .join('\n');
      break;
    }
    case 'how': {
      buttonMeta = [
        ['fc:frame:button:1', 'Open Mini App'],
        ['fc:frame:button:1:action', 'link'],
        ['fc:frame:button:1:target', `${SITE}/mini`],

        ['fc:frame:button:2', 'Back'],
        ['fc:frame:button:2:action', 'post'],

        ['fc:frame:button:3', 'Read on Site'],
        ['fc:frame:button:3:action', 'link'],
        ['fc:frame:button:3:target', `${SITE}/#how`],
      ]
        .map(([k, v]) => `<meta property="${k}" content="${v}" />`)
        .join('\n');
      break;
    }
  }

  // post_url always comes back to this endpoint; we keep track of the
  // current screen server-side (by buttonIndex) rather than with state.
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width"/>
    <title>Rate Me — Frame</title>

    <!-- Open Graph -->
    <meta property="og:title" content="${title}"/>
    <meta property="og:image" content="${image}"/>
    <meta property="og:url" content="${SITE}/"/>

    <!-- Farcaster Frames vNext -->
    <meta property="fc:frame" content="vNext"/>
    <meta property="fc:frame:image" content="${image}"/>
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1"/>
    <meta property="fc:frame:post_url" content="${SITE}/api/frame"/>

    ${buttonMeta}
  </head>
  <body style="font:14px system-ui;padding:24px;color:#e5e7eb;background:#0b1220">
    <b>Rate Me</b> — ${screen === 'home' ? 'Home' : screen === 'creators' ? 'Top Creators' : 'How it Works'} frame.
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function GET(_req: NextRequest) {
  // Default screen is "home"
  return renderFrame('home');
}

export async function POST(req: NextRequest) {
  // Warpcast sends form data including `buttonIndex` (1-based)
  // for vNext interactions.
  let screen: Screen = 'home';
  try {
    const form = await req.formData();
    const idx = Number(form.get('buttonIndex') || 0);

    // From "home"
    if (idx === 2) screen = 'creators';
    else if (idx === 3) screen = 'how';
    else screen = 'home';

    // From "creators" / "how", the "Back" button is index 2 as well.
    // We keep the same logic: index 2 → home.
    if (idx === 2) screen = 'home';
  } catch {
    screen = 'home';
  }

  return renderFrame(screen);
}
