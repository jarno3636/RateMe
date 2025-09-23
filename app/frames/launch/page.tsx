// app/frames/launch/page.tsx
export const dynamic = "force-dynamic";

/**
 * This is a static frame entry page (GET). It renders the
 * initial frame with a single "Launch" button.
 *
 * POST actions are handled in /app/api/frames/launch/route.ts
 */
function frameHtml({
  image,
  postUrl,
  title = "OnlyStars — Launch",
  button = "Launch OnlyStars",
}: {
  image: string;
  postUrl: string;
  title?: string;
  button?: string;
}) {
  // Return a bare HTML doc with the required <meta> tags
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <!-- Open Graph (preview in Warpcast) -->
    <meta property="og:title" content="${title}" />
    <meta property="og:image" content="${image}" />
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="${image}" />
    <meta name="fc:frame:post_url" content="${postUrl}" />
    <meta name="fc:frame:button:1" content="${button}" />
  </head>
  <body/>
</html>`;
}

// Adjust these to your domain/assets
const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com";
const DEFAULT_IMAGE = `${DOMAIN}/frames/launch.png`; // put a 1200x630 og image in /public/frames/launch.png
const POST_URL = `${DOMAIN}/api/frames/launch`;

export default function Page() {
  return new Response(
    frameHtml({
      image: DEFAULT_IMAGE,
      postUrl: POST_URL,
      title: "OnlyStars — Launch",
      button: "Open OnlyStars",
    }),
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    }
  ) as unknown as JSX.Element;
}
