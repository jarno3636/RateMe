// app/api/frames/launch/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Minimal handler for the Launch Frame button.
 * Receives Warpcast Frame payload (untrustedData/trustedData),
 * then responds with another HTML frame state.
 */

function renderFrameHTML({
  image,
  button1,
  button1Url,
  title = "OnlyStars — Ready",
}: {
  image: string;
  button1: string;
  button1Url: string; // if you include URL on a button, use fc:frame:button:1:action=open_url
  title?: string;
}) {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:image" content="${image}" />

    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="${image}" />

    <!-- Button 1: open_url takes user out to your app -->
    <meta name="fc:frame:button:1" content="${button1}" />
    <meta name="fc:frame:button:1:action" content="open_url" />
    <meta name="fc:frame:button:1:target" content="${button1Url}" />
  </head>
  <body/>
</html>
`;
}

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com";
const IMAGE_READY = `${DOMAIN}/frames/ready.png`; // add /public/frames/ready.png (1200x630)
const APP_HOME = `${DOMAIN}/creator`;             // where you want to send users (adjust)

export async function POST(req: Request) {
  try {
    // If you need to inspect payload:
    // const payload = await req.json(); // { untrustedData, trustedData }
    // (You can verify trustedData if you integrate with a hub/SDK.)

    const html = renderFrameHTML({
      image: IMAGE_READY,
      button1: "Open OnlyStars",
      button1Url: APP_HOME,
      title: "OnlyStars — Let’s go",
    });

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    console.error("[/api/frames/launch] error:", e);
    return NextResponse.json({ error: e?.message || "Frame error" }, { status: 500 });
  }
}

export async function GET() {
  // optional: helpful for quick health checks
  return NextResponse.json({ ok: true });
}
