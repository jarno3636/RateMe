/// components/SubscriptionBadge.tsx (sketch)
'use client'
import { useEffect, useState } from 'react'
import { useGate } from '@/hooks/useGate'

export default function SubscriptionBadge({ creatorAddress }: { creatorAddress: `0x${string}` }) {
  const { user, checkSub } = useGate()
  const [active, setActive] = useState<boolean | null>(null)

  useEffect(() => {
    let done = false
    ;(async () => {
      if (!user || !creatorAddress) return
      const ok = await checkSub(creatorAddress)
      if (!done) setActive(ok)
    })()
    return () => { done = true }
  }, [user, creatorAddress, checkSub])

  if (active === null) return <span className="text-xs text-slate-400">Checking…</span>
  return active
    ? <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">Subscribed</span>
    : <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">Not subscribed</span>
}
