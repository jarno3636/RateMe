// /components/StatsSection.tsx
"use client"

import { useCreatorPlanIds, useCreatorPostIds } from "@/hooks/useCreatorHub"
import { useAverage } from "@/hooks/useRatings"

export default function StatsSection({
  creator,
  profileId,
}: {
  creator: `0x${string}`
  profileId: bigint
}) {
  const { data: postIds, isLoading: postsLoading } = useCreatorPostIds(creator)
  const { data: planIds, isLoading: plansLoading } = useCreatorPlanIds(creator)
  const posts = (postIds as bigint[] | undefined) ?? []
  const plans = (planIds as bigint[] | undefined) ?? []

  const { data: avgX100, isLoading: avgLoading } = useAverage(creator)
  const avg = avgX100 ? (Number(avgX100) / 100).toFixed(2) : "-"

  return (
    <section className="card">
      <div className="mb-3 text-lg font-semibold">Creator stats</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatBox label="Posts" value={postsLoading ? "…" : posts.length.toString()} />
        <StatBox label="Plans" value={plansLoading ? "…" : plans.length.toString()} />
        <StatBox label="Avg rating" value={avgLoading ? "…" : avg} />
      </div>
    </section>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-sm opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
