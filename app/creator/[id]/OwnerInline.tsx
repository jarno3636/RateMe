// app/creator/[id]/OwnerInline.tsx
'use client'

import { useAccount } from 'wagmi'
import dynamic from 'next/dynamic'
import type { Address } from 'viem'
import EditProfileBox from './EditProfileBox'

// Lazy-load the dashboard (plans/posts)
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
  currentAvatar,
  currentBio,
}: {
  creatorAddress: `0x${string}` | null
  creatorId: string
  currentAvatar?: string | null
  currentBio?: string | null
}) {
  const { address } = useAccount()
  if (!creatorAddress || !address) return null
  const isOwner =
    creatorAddress.toLowerCase() === (address as Address).toLowerCase()
  if (!isOwner) return null

  return (
    <section className="mt-2 space-y-4">
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        <div className="mb-3 text-sm font-medium text-cyan-200">
          Manage your page
        </div>

        {/* Profile photo/bio editor */}
        <EditProfileBox
          creatorId={creatorId}
          currentAvatar={currentAvatar}
          currentBio={currentBio}
        />

        {/* Plans & posts */}
        <div className="mt-4">
          <DashboardClient />
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          Tip: For paid posts you can add a preview and blur it for
          non-subscribers. Free posts (price 0) show unblurred.
        </div>
      </div>
    </section>
  )
}
