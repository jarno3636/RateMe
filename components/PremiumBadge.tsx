// /components/PremiumBadge.tsx
"use client"

import * as React from "react"

type Kind =
  | "pro"          // e.g., top creators, verified, etc.
  | "subscriber"   // user has an active sub (viewer-side) or sub-gated content
  | "free"         // free content
  | "paid"         // one-off paid post
  | "inactive"     // plan/post not active
  | "new"          // recently created

const LABELS: Record<Kind, string> = {
  pro: "Pro",
  subscriber: "Subscriber",
  free: "Free",
  paid: "Paid",
  inactive: "Inactive",
  new: "New",
}

export default function PremiumBadge({
  kind,
  className,
  title,
}: {
  kind: Kind
  className?: string
  title?: string
}) {
  // Subtle color tweaks per kind
  const styles: Record<Kind, string> = {
    pro: "bg-gradient-to-r from-pink-500/80 to-fuchsia-500/80 text-white",
    subscriber: "bg-emerald-500/80 text-white",
    free: "bg-white/20 text-white",
    paid: "bg-amber-500/90 text-black",
    inactive: "bg-zinc-700/80 text-zinc-200",
    new: "bg-sky-500/90 text-white",
  }

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
        "ring-1 ring-white/20 shadow-sm",
        styles[kind],
        className || "",
      ].join(" ")}
      title={title || LABELS[kind]}
    >
      {LABELS[kind]}
    </span>
  )
}
