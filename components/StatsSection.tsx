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
  const {
    data: postIds,
    isLoading: postsLoading,
    error: postsError,
  } = useCreatorPostIds(creator, { watch })
  const {
    data: planIds,
    isLoading: plansLoading,
    error: plansError,
  } = useCreatorPlanIds(creator, { watch })

  const posts = (postIds as bigint[] | undefined) ?? []
  const plans = (planIds as bigint[] | undefined) ?? []

  const {
    data: avgX100,
    isLoading: avgLoading,
    error: avgError,
  } = useAverage(creator)

  const avg = useMemo(() => {
    if (!avgX100 && avgX100 !== 0n) return "–"
    const n = Number(avgX100) / 100
    return Number.isFinite(n) ? n.toFixed(2) : "–"
  }, [avgX100])

  return (
    <section className="card">
      <div className="mb-3 text-lg font-semibold">Creator stats</div>

      {(postsError || plansError || avgError) && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          Couldn’t load some stats. They’ll retry automatically.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatBox
          label="Posts"
          value={postsLoading ? undefined : posts.length.toString()}
        />
        <StatBox
          label="Plans"
          value={plansLoading ? undefined : plans.length.toString()}
        />
        <StatBox
          label="Avg rating"
          value={avgLoading ? undefined : avg}
        />
      </div>

      <p className="mt-2 text-xs opacity-60">
        Profile ID: {profileId.toString()} • Live updates: {watch ? "on" : "off"}
      </p>
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
        <div className="mt-1 h-7 w-16 animate-pulse rounded-md bg-white/10" aria-hidden />
      ) : (
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      )}
    </div>
  )
}
