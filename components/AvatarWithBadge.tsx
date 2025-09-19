// /components/AvatarWithBadge.tsx
"use client"

import * as React from "react"
import PremiumBadge from "./PremiumBadge"

type Status = "none" | "online" | "offline" | "busy"

export default function AvatarWithBadge({
  src,
  size = 64,
  badge,
  alt = "",
  className,
  name,                 // optional: used to derive initials fallback
  href,                 // optional: wrap avatar in a link
  onClick,              // optional: clickable avatar
  status = "none",      // optional: status dot
  ring = "default",     // "default" | "pro" | "gold" | "glow"
  rounded = true,       // set false for square thumbnails
  overlay,              // optional: arbitrary overlay node (e.g. <CastButton .../>)
  loading = "lazy",     // "lazy" | "eager"
  priority = false,     // when you explicitly want eager-like behavior
}: {
  src?: string | null
  size?: number
  badge?: React.ReactNode            // pass <PremiumBadge kind="pro" /> etc.
  alt?: string
  className?: string
  name?: string
  href?: string
  onClick?: () => void
  status?: Status
  ring?: "default" | "pro" | "gold" | "glow"
  rounded?: boolean
  overlay?: React.ReactNode          // flexible overlay: buttons, icons, etc.
  loading?: "lazy" | "eager"
  priority?: boolean
}) {
  const [err, setErr] = React.useState(false)
  const px = `${size}px`
  const radius = rounded ? "rounded-full" : "rounded-xl"
  const fallbackSrc = "/avatar.png"

  // Derive initials for deep fallback
  const initials = React.useMemo(() => {
    const base = (name || alt || "").trim()
    if (!base) return "?"
    const parts = base.split(/\s+/).slice(0, 2)
    return parts.map(p => p[0]?.toUpperCase() ?? "").join("") || "?"
  }, [name, alt])

  // Premium rings
  const ringClass =
    ring === "pro"
      ? "ring-1 ring-pink-400/60"
      : ring === "gold"
      ? "ring-1 ring-amber-400/70"
      : ring === "glow"
      ? "ring-1 ring-pink-400/60 shadow-[0_0_20px_rgba(236,72,153,0.45)]"
      : "ring-1 ring-white/10"

  const Wrapper = href ? "a" : (onClick ? "button" : "div")

  // Status dot color
  const statusDot =
    status === "online" ? "bg-emerald-400" :
    status === "busy"   ? "bg-rose-400" :
    status === "offline"? "bg-zinc-500" : ""

  // Final source logic
  const showImg = !!src && !err
  const imgSrc = showImg ? src! : fallbackSrc

  return (
    <Wrapper
      {...(href ? { href, target: "_self" } : {})}
      {...(onClick ? { onClick, type: "button" } : {})}
      className={[
        "relative inline-block select-none",
        className || "",
      ].join(" ")}
      aria-label={alt || name || "avatar"}
      title={alt || name || undefined}
      style={{ width: px, height: px }}
    >
      {/* Image or fallback */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {showImg ? (
        <img
          src={imgSrc}
          alt={alt}
          width={size}
          height={size}
          className={[
            "h-full w-full object-cover",
            radius,
            ringClass,
            "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]",
          ].join(" ")}
          onError={() => setErr(true)}
          loading={priority ? "eager" : loading}
          decoding="async"
        />
      ) : (
        <div
          className={[
            "flex h-full w-full items-center justify-center",
            radius,
            ringClass,
            "bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-200",
          ].join(" ")}
          role="img"
          aria-label={alt || name || "avatar placeholder"}
        >
          <span className="text-xs font-semibold tracking-wide">{initials}</span>
        </div>
      )}

      {/* Optional top-right badge (kept for backwards-compat) */}
      {badge ? (
        <div className="pointer-events-none absolute -right-1 -top-1">
          {badge}
        </div>
      ) : null}

      {/* Optional overlay slot (bottom-right), e.g. <CastButton />, verified, etc. */}
      {overlay ? (
        <div className="absolute -right-1 -bottom-1">
          {overlay}
        </div>
      ) : null}

      {/* Optional status dot */}
      {status !== "none" && (
        <span
          aria-hidden
          className={[
            "absolute -bottom-1 -right-1 h-3 w-3 rounded-full ring-2 ring-black/80",
            statusDot,
          ].join(" ")}
        />
      )}
    </Wrapper>
  )
}

/* -------------------------- Handy presets -------------------------- */
/** Small convenience: premium verified avatar */
export function ProAvatar(props: React.ComponentProps<typeof AvatarWithBadge>) {
  return (
    <AvatarWithBadge
      ring="glow"
      badge={<PremiumBadge kind="pro" />}
      {...props}
    />
  )
}
