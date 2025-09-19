// /components/StatsSection.tsx
"use client"

import { useCallback, useMemo } from "react"
import { base } from "viem/chains"
import { useCreatorPlanIds, useCreatorPostIds } from "@/hooks/useCreatorHub"
import { useAverage } from "@/hooks/useRatings"
import ShareBar from "@/components/ShareBar"
import { RotateCw, ExternalLink } from "lucide-react"

type Props = {
  /** Creator wallet address (checksummed `0x...`) */
  creator: `0x${string}`
  /** Numeric Profile Registry id */
  profileId: bigint
  /** Live-update on new blocks (defaults false) */
  watch?: boolean
  /** Optional handle to enable premium ShareBar (e.g., "vitalik") */
  handle?: string
}

/** Small pill badge */
function Badge({
  label,
  tone = "zinc",
}: {
  label: string
  tone?: "pink" | "sky" | "zinc"
}) {
  const toneCls =
    tone === "pink"
      ? "border-pink-500/40 bg-pink-500/10"
      : tone === "sky"
      ? "border-sky-400/40 bg-sky-400/10"
      : "border-white/10 bg-white/5"
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs",
        "border",
        toneCls,
      ].join(" ")}
      aria-label={`Badge: ${label}`}
      title={label}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  )
}

function StatBox({
  label,
  value,
  tooltip,
}: {
  label: string
  value?: string
  tooltip?: string
}) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-black/30 p-4"
      role="group"
      aria-label={label}
      title={tooltip}
    >
      <div className="text-sm opacity-70">{label}</div>
      {value === undefined ? (
        <div className="mt-1 h-7 w-16 animate-pulse rounded-md bg-white/10" aria-hidden />
      ) : (
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      )}
    </div>
  )
}

export default function StatsSection({ creator, profileId, watch = false, handle }: Props) {
  // ── Reads
  const {
    data: postIds,
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useCreatorPostIds(creator, { watch })
  const {
    data: planIds,
    isLoading: plansLoading,
    error: plansError,
    refetch: refetchPlans,
  } = useCreatorPlanIds(creator, { watch })
  const {
    data: avgX100,
    isLoading: avgLoading,
    error: avgError,
    refetch: refetchAvg,
  } = useAverage(creator, { watch })

  const posts = (postIds as bigint[] | undefined) ?? []
  const plans = (planIds as bigint[] | undefined) ?? []

  const avg = useMemo(() => {
    if (avgX100 === undefined || avgX100 === null) return "–"
    const n = Number(avgX100) / 100
    return Number.isFinite(n) ? n.toFixed(2) : "–"
  }, [avgX100])

  // Derived badges (role-aware vibes from on-chain state)
  const badges = useMemo(() => {
    const out: Array<{ label: string; tone: "pink" | "sky" | "zinc" }> = []
    if (!postsLoading && posts.length > 0) out.push({ label: "Active", tone: "pink" })
    if (!plansLoading && plans.length > 0) out.push({ label: "Monetized", tone: "sky" })
    if (out.length === 0) out.push({ label: "Getting started", tone: "zinc" })
    return out
  }, [plans.length, plansLoading, posts.length, postsLoading])

  // Any error?
  const someError = postsError || plansError || avgError

  // Quick manual refresh
  const onRefresh = useCallback(() => {
    void refetchPosts()
    void refetchPlans()
    void refetchAvg()
  }, [refetchPosts, refetchPlans, refetchAvg])

  // Optional: link to BaseScan for creator address
  const basescan = useMemo(() => {
    const host =
      process.env.NEXT_PUBLIC_BASESCAN_URL?.replace(/\/+$/, "") ||
      "https://basescan.org"
    return `${host}/address/${creator}`
  }, [creator])

  return (
    <section className={["card overflow-hidden p-0", "border-white/10"].join(" ")}>
      {/* Header */}
      <div
        className={[
          "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
          "bg-gradient-to-r from-pink-500/10 via-transparent to-transparent",
          "border-b border-white/10",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="text-lg font-semibold">Creator stats</div>
          <a
            href={basescan}
            target="_blank"
            rel="noopener noreferrer"
            title="View on BaseScan"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] opacity-80 hover:opacity-100"
          >
            BaseScan <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badges */}
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            {badges.map((b, i) => (
              <Badge key={`${b.label}-${i}`} label={b.label} tone={b.tone} />
            ))}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50"
            title="Refresh"
            aria-label="Refresh stats"
          >
            <RotateCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {/* Mobile badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2 sm:hidden">
          {badges.map((b, i) => (
            <Badge key={`${b.label}-${i}`} label={b.label} tone={b.tone} />
          ))}
        </div>

        {someError && (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            Couldn’t load some stats. They’ll retry automatically. You can also try refresh.
          </div>
        )}

        {/* 3-up stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatBox label="Posts" value={postsLoading ? undefined : String(posts.length)} />
          <StatBox label="Plans" value={plansLoading ? undefined : String(plans.length)} />
          <StatBox
            label="Avg rating"
            value={avgLoading ? undefined : avg}
            tooltip="Average community rating (out of 5)"
          />
        </div>

        {/* Meta + Share */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] opacity-60">
            Profile ID: {profileId.toString()} • Chain: Base ({base.id}) • Live updates:{" "}
            {watch ? "on" : "off"}
          </p>

          {/* Premium: Farcaster/X/Copy Share bar (enabled if handle present) */}
          {handle ? (
            <ShareBar creatorId={profileId.toString()} handle={handle} size="compact" />
          ) : null}
        </div>
      </div>
    </section>
  )
}
