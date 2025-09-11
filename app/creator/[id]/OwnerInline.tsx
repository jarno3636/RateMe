// app/creator/[id]/OwnerInline.tsx
'use client'

import { useAccount } from 'wagmi'
import dynamic from 'next/dynamic'
import type { Address } from 'viem'

// Lazy-load the dashboard to keep initial TTFB snappy
const DashboardClient = dynamic(() => import('../../creator/DashboardClient'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
      Loading creator tools…
    </div>
  ),
})

export default function OwnerInline({
  creatorAddress,
  creatorId,
}: {
  creatorAddress: `0x${string}` | null
  creatorId: string
}) {
  const { address } = useAccount()

  if (!creatorAddress || !address) return null
  const isOwner =
    creatorAddress.toLowerCase() === (address as Address).toLowerCase()
  if (!isOwner) return null

  return (
    <section className="mt-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="mb-3 text-sm font-medium text-cyan-200">
        Manage your page
      </div>
      {/* Your existing managers (plans + posts) render here */}
      <DashboardClient />

      {/* Optional tip to creator about blurring previews */}
      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
        Tip: When creating a paid post, you can add a preview and set it to be
        blurred for non-subscribers. Free posts (price 0) always show unblurred.
      </div>
    </section>
  )
}
