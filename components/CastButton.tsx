// /components/CastButton.tsx
"use client"

type Props = {
  href: string               // absolute or relative URL to share (we'll resolve origin on client)
  text?: string              // prefilled text
  className?: string
  size?: "sm" | "md"
}

function getOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")
  return env || "https://onlystars.app"
}

export default function CastButton({ href, text = "Check this out ✨", className, size = "md" }: Props) {
  const origin = getOrigin()
  const abs = href.startsWith("http") ? href : `${origin}${href}`
  const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(abs)}`

  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={[
        "inline-flex items-center gap-1 rounded-full transition",
        "border border-violet-400/60 bg-violet-400/10 hover:bg-violet-400/20",
        "focus:outline-none focus:ring-2 focus:ring-violet-400/50",
        padding,
        className || "",
      ].join(" ")}
      title="Cast to Farcaster"
    >
      <span aria-hidden className="block h-2 w-2 rounded-full bg-violet-400" />
      Cast
    </a>
  )
}
