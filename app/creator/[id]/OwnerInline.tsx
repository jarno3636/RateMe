// app/creator/[id]/OwnerInline.tsx
'use client'

import { useAccount } from 'wagmi'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Address } from 'viem'
import { getAddress } from 'viem'
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

  // Checksum-safe comparison
  let isOwner = false
  try {
    isOwner =
      getAddress(creatorAddress as Address) === getAddress(address as Address)
  } catch {
    isOwner = false
  }
  if (!isOwner) return null

  return (
    <section className="mt-2 space-y-4">
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        {/* Owner tools header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-cyan-200">
            Manage your page
          </div>
          <Link
            href="#creator-tools"
            className="text-xs text-cyan-200/90 underline decoration-cyan-400/30 underline-offset-2 hover:text-cyan-100"
          >
            Jump to tools
          </Link>
        </div>

        {/* Profile photo/bio editor */}
        <EditProfileBox
          creatorId={creatorId}
          currentAvatar={currentAvatar}
          currentBio={currentBio}
        />

        {/* Help accordions */}
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <details className="rounded-lg border border-white/10 bg-white/5 p-3 open:bg-white/7.5">
            <summary className="cursor-pointer select-none text-sm font-medium text-slate-200">
              How subscriptions work
            </summary>
            <div className="mt-2 text-xs leading-relaxed text-slate-300">
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Create a <strong>Subscription plan</strong> with a price in USDC and a period
                  (e.g., monthly = 30 days).
                </li>
                <li>
                  Fans buy your plan on Base. The contract tracks their active period automatically.
                </li>
                <li>
                  Any post you mark as <em>Accessible via active subscription</em> unlocks for them while their
                  sub is active.
                </li>
                <li>
                  You can edit/disable plans later. Payouts remain on-chain; you can withdraw in your wallet.
                </li>
              </ul>
            </div>
          </details>

          <details className="rounded-lg border border-white/10 bg-white/5 p-3 open:bg-white/7.5">
            <summary className="cursor-pointer select-none text-sm font-medium text-slate-200">
              Paid posts & previews (blur)
            </summary>
            <div className="mt-2 text-xs leading-relaxed text-slate-300">
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Paste your content URI (image/video/file) — e.g., <code>ipfs://</code> or <code>https://</code>.
                </li>
                <li>
                  Set a price (USDC) or use <strong>0</strong> for a free post.
                </li>
                <li>
                  Toggle <em>Accessible via active subscription</em> to let subs view without per-post payments.
                </li>
                <li>
                  Add <code>#rm_preview=...</code> to the URI for a teaser and <code>#rm_blur=1</code> to blur locked content.
                </li>
              </ul>
            </div>
          </details>
        </div>

        {/* Plans & posts */}
        <div id="creator-tools" className="mt-4">
          <DashboardClient />
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          Tip: Free posts (price = 0) are always visible. Paid or sub-gated posts can show a
          preview with the main content blurred until unlocked.
        </div>
      </div>
    </section>
  )
}
