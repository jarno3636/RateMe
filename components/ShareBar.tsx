// components/ShareBar.tsx
'use client'

import { creatorShareLinks } from '@/lib/farcaster'

export default function ShareBar({ creatorId, handle }: { creatorId: string; handle: string }) {
  const { url, cast, tweet } = creatorShareLinks(handle, `Check out @${handle} on Rate Me`)

  return (
    <div className="flex flex-wrap gap-2">
      <a className="btn-secondary" href={tweet} target="_blank" rel="noreferrer">
        Share on X
      </a>
      <a className="btn-secondary" href={cast} target="_blank" rel="noreferrer">
        Share on Warpcast
      </a>
      <button
        className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url)
            alert('Profile link copied')
          } catch {
            prompt('Copy link:', url)
          }
        }}
      >
        Copy link
      </button>
    </div>
  )
}
