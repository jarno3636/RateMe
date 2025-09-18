// /components/AvatarWithBadge.tsx
"use client"

import * as React from "react"
import PremiumBadge from "./PremiumBadge"

export default function AvatarWithBadge({
  src,
  size = 64,
  badge,
  alt = "",
  className,
}: {
  src?: string | null
  size?: number
  badge?: React.ReactNode   // pass <PremiumBadge kind="pro" /> etc.
  alt?: string
  className?: string
}) {
  const px = `${size}px`
  return (
    <div className={["relative shrink-0", className || ""].join(" ")} style={{ width: px, height: px }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || "/avatar.png"}
        alt={alt}
        width={size}
        height={size}
        className="h-full w-full rounded-full object-cover ring-1 ring-white/10"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/avatar.png" }}
        loading="eager"
      />
      {badge ? (
        <div className="absolute -right-1 -top-1">
          {badge}
        </div>
      ) : null}
    </div>
  )
}
