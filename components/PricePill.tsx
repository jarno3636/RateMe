// /components/PricePill.tsx
"use client"

import React, { useMemo } from "react"

/** Convert a bigint token amount into a human string at given decimals (no JS float drift). */
function formatUnits(amount: bigint, decimals: number): string {
  const neg = amount < 0n
  const div = 10n ** BigInt(decimals)
  const whole = (neg ? -amount : amount) / div
  const frac = (neg ? -amount : amount) % div

  const wholeStr = whole.toString()
  if (decimals === 0) return (neg ? "-" : "") + wholeStr

  const fracStrRaw = frac.toString().padStart(decimals, "0")
  // Trim trailing zeros but keep at least 2 dp for money readability
  const trimmed = fracStrRaw.replace(/0+$/, "")
  const fracStr = trimmed.length === 0 ? "00" : trimmed.slice(0, Math.max(2, trimmed.length))

  return `${neg ? "-" : ""}${wholeStr}.${fracStr}`
}

/** Format a token/fiat-like amount for display. */
function formatAmountHuman(amount: bigint, decimals: number): string {
  const s = formatUnits(amount, decimals)
  // Use Intl for thousand separators; keep 2–6 decimals depending on non-zero tail.
  const [intPart, fracPart = ""] = s.split(".")
  const n = Number(intPart) // safe: only integer part
  const grouped = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
  const frac = fracPart.length ? "." + fracPart : ""
  return grouped + frac
}

export function formatPrice({
  amount,
  decimals,
  symbol,
  isNative,
}: {
  amount: bigint
  decimals?: number
  symbol?: string
  isNative?: boolean
}): string {
  // Defaults: 18 for native (ETH/BASE), 6 otherwise (USDC-like)
  const d = typeof decimals === "number" ? decimals : isNative ? 18 : 6
  const body = formatAmountHuman(amount, d)
  return symbol ? `${body} ${symbol}` : body
}

type PricePillProps = {
  /** Raw token amount (bigint, e.g. 1000000n for 1.0 USDC @ 6dp) */
  value: bigint
  /** Override decimals; defaults to 18 for native and 6 for ERC20 */
  decimals?: number
  /** Symbol text, e.g. "USDC", "ETH" */
  symbol?: string
  /** Whether the token is the native asset (assumes 18dp if decimals not provided) */
  isNative?: boolean
  /** Emphasize style */
  emphasis?: boolean
  /** Smaller visual */
  compact?: boolean
  className?: string
}

export default function PricePill({
  value,
  decimals,
  symbol,
  isNative,
  emphasis,
  compact,
  className,
}: PricePillProps) {
  const text = useMemo(
    () =>
      formatPrice({
        amount: value,
        ...(decimals !== undefined ? { decimals } : {}),
        ...(symbol !== undefined ? { symbol } : {}),
        ...(isNative !== undefined ? { isNative } : {}),
      }),
    [value, decimals, symbol, isNative]
  )

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5",
        emphasis ? "border-pink-500/70 bg-pink-500/15" : "border-white/15 bg-white/5",
        compact ? "text-[11px] leading-4" : "text-xs",
        className || "",
      ].join(" ")}
      aria-label="Price"
      title={text}
    >
      {text}
    </span>
  )
}
