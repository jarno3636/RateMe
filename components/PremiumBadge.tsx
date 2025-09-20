// /components/PremiumBadge.tsx
"use client"

import * as React from "react"
import {
  Sparkles,
  BadgeCheck,
  Crown,
  DollarSign,
  Star,
  Power,
  Pause,
  Plus,
  type LucideIcon,        // <-- add this
} from "lucide-react"

type Kind =
  | "pro"
  | "subscriber"
  | "free"
  | "paid"
  | "inactive"
  | "new"

type Size = "xs" | "sm" | "md"

const DEFAULT_LABELS: Record<Kind, string> = {
  pro: "Pro",
  subscriber: "Subscriber",
  free: "Free",
  paid: "Paid",
  inactive: "Inactive",
  new: "New",
}

const KIND_STYLES: Record<Kind, string> = {
  pro: "bg-gradient-to-r from-pink-500/90 to-fuchsia-500/90 text-white ring-white/25 shadow-[0_0_18px_rgba(236,72,153,.35)]",
  subscriber: "bg-emerald-500 text-white ring-white/20",
  free: "bg-white/15 text-white ring-white/20",
  paid: "bg-amber-400 text-black ring-white/20",
  inactive: "bg-zinc-700/90 text-zinc-200 ring-white/10",
  new: "bg-sky-500 text-white ring-white/20",
}

const SIZE_STYLES: Record<Size, string> = {
  xs: "text-[9px] px-1.5 py-0.5 gap-1",
  sm: "text-[10px] px-2 py-0.5 gap-1.5",
  md: "text-[11px] px-2.5 py-0.5 gap-1.5",
}

// ✅ Use LucideIcon here
const ICONS: Record<Kind, LucideIcon> = {
  pro: Crown,
  subscriber: BadgeCheck,
  free: Star,
  paid: DollarSign,
  inactive: Pause,
  new: Sparkles,
}

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

export type PremiumBadgeProps = {
  kind: Kind
  labelOverride?: string
  size?: Size
  pulse?: boolean
  hideIcon?: boolean
  // ✅ And here
  iconOverride?: LucideIcon
  title?: string
  className?: string
  as?: "span" | "button" | "a"
  href?: string
  onClick?: React.MouseEventHandler<HTMLElement>
  disabled?: boolean
  "data-attr"?: string
} & React.HTMLAttributes<HTMLElement>

const PremiumBadge = React.forwardRef<HTMLElement, PremiumBadgeProps>(function PremiumBadge(
  {
    kind,
    labelOverride,
    size = "sm",
    pulse,
    hideIcon,
    iconOverride,
    title,
    className,
    as = "span",
    href,
    onClick,
    disabled,
    "data-attr": dataAttr,
    ...rest
  },
  ref
) {
  const Icon = iconOverride ?? ICONS[kind] ?? Plus
  const label = labelOverride ?? DEFAULT_LABELS[kind]

  const base = cx(
    "inline-flex select-none items-center rounded-full uppercase tracking-wide ring-1",
    KIND_STYLES[kind],
    SIZE_STYLES[size],
    as !== "span" && !disabled && "transition-shadow hover:shadow-[0_0_20px_rgba(255,255,255,.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
    disabled && "opacity-60 cursor-not-allowed",
    pulse && "relative overflow-hidden",
    className
  )

  const shimmer = pulse ? (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(90deg,transparent,white,transparent)]"
    >
      <span className="absolute -inset-y-2 -left-full w-1/2 translate-x-0 animate-[shimmer_1.8s_infinite] bg-white/20" />
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </span>
  ) : null

  const content = (
    <>
      {!hideIcon && (
        <Icon
          aria-hidden
          className={cx(
            size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3",
            kind === "paid" ? "stroke-[2.25]" : "stroke-[2]"
          )}
        />
      )}
      <span className="font-medium">{label}</span>
      {shimmer}
    </>
  )

  const commonProps = {
    ref: ref as any,
    className: base,
    title: title ?? label,
    role: as === "button" ? "button" : undefined,
    "aria-disabled": disabled || undefined,
    "data-kind": kind,
    "data-attr": dataAttr,
    ...rest,
  }

  if (as === "a") {
    return (
      <a {...(commonProps as React.AnchorHTMLAttributes<HTMLAnchorElement>)} href={href} onClick={onClick}>
        {content}
      </a>
    )
  }

  if (as === "button") {
    return (
      <button
        {...(commonProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        type="button"
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    )
  }

  return (
    <span {...(commonProps as React.HTMLAttributes<HTMLSpanElement>)} onClick={onClick as any}>
      {content}
    </span>
  )
})

export default PremiumBadge
