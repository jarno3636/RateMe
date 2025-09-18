// /components/StatsSection.tsx
"use client"

import { useMemo } from "react"
import { useCreatorPlanIds, useCreatorPostIds } from "@/hooks/useCreatorHub"
import { useAverage } from "@/hooks/useRatings"

type Props = {
  creator: `0x${string}`
  profileId: bigint
  /** Live-update on new blocks (defaults false) */
  watch?: boolean
}

export default function StatsSection({ creator, profileId, watch = false }: Props) {
  // Reads
  const { data: postIds, isLoading: postsLoading, error: postsError } =
    useCreatorPostIds(creator, { watch })
  const { data: planIds, isLoading: plansLoading, error: plansError } =
    useCreatorPlanIds(creator, { watch })
  const { data: avgX100, isLoading: avgLoading, error: avgError } = useAverage(creator)

  const posts = (postIds as bigint[] | undefined) ?? []
  const plans = (planIds as bigint[] | undefined) ?? []

  const avg = useMemo(() => {
    if (avgX100 === undefined || avgX100 === null) return "–"
    const n = Number(avgX100) / 100
    return Number.isFinite(n) ? n.toFixed(2) : "–"
  }, [avgX100])

  // Premium badges (role-aware vibes without auth): derived from on-chain state
  const badges = useMemo(() => {
    const out: Array<{ label: string; tone: "pink" | "sky" | "zinc" }> = []
    if (!postsLoading && posts.length > 0) out.push({ label: "Active", tone: "pink" })
    if (!plansLoading && plans.length > 0) out.push({ label: "Monetized", tone: "sky" })
    if (out.length === 0) out.push({ label: "Getting started", tone: "zinc" })
    return out
  }, [plans.length, plansLoading, posts.length, postsLoading])

  const someError = postsError || plansError || avgError

  return (
    <section
      className={[
        "card overflow-hidden p-0", // we’ll control padding inside the header/body for tighter visual rhythm
        "border-white/10",
      ].join(" ")}
    >
      {/* Header with subtle gradient & badges */}
      <div
        className={[
          "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
          "bg-gradient-to-r from-pink-500/10 via-transparent to-transparent",
          "border-b border-white/10",
        ].join(" ")}
      >
        <div className="text-lg font-semibold">Creator stats</div>

        {/* Status badges (wrap cleanly on small screens) */}
        <div className="flex flex-wrap items-center gap-2">
          {badges.map((b, i) => (
            <span
              key={`${b.label}-${i}`}
              className={[
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs",
                "border",
                b.tone === "pink" && "border-pink-500/40 bg-pink-500/10",
                b.tone === "sky" && "border-sky-400/40 bg-sky-400/10",
                b.tone === "zinc" && "border-white/10 bg-white/5",
              ].join(" ")}
              aria-label={`Badge: ${b.label}`}
              title={b.label}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {someError && (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            Couldn’t load some stats. They’ll retry automatically.
          </div>
        )}

        {/* 3-up stats, consistent heights & tabular numerals */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatBox label="Posts" value={postsLoading ? undefined : String(posts.length)} />
          <StatBox label="Plans" value={plansLoading ? undefined : String(plans.length)} />
          <StatBox label="Avg rating" value={avgLoading ? undefined : avg} />
        </div>

        {/* Meta line */}
        <p className="mt-2 text-[11px] opacity-60">
          Profile ID: {profileId.toString()} • Live updates: {watch ? "on" : "off"}
        </p>
      </div>
    </section>
  )
}

function StatBox({ label, value }: { label: string; value?: string }) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-black/30 p-4"
      role="group"
      aria-label={label}
    >
      <div className="text-sm opacity-70">{label}</div>
      {value === undefined ? (
        <div
          className="mt-1 h-7 w-16 animate-pulse rounded-md bg-white/10"
          aria-hidden
        />
      ) : (
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      )}
    </div>
  )
}
