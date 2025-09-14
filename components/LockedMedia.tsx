// components/LockedMedia.tsx
'use client'

import { useEffect, useState } from 'react'
import { useGate } from '@/hooks/useGate'
import { Loader2, LockKeyhole } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LockedMedia({
  postId,
  uri,           // full URI with #rm_preview / #rm_blur hints
}: {
  postId: bigint
  uri: string
}) {
  const { user, loading, allowed, error, checkPost } = useGate()
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user || attempted) return
      const ok = await checkPost(postId)
      if (!cancelled) setAttempted(true)
      if (!ok && error) toast.error(error)
    })()
    return () => { cancelled = true }
  }, [user, attempted, checkPost, postId, error])

  const url = new URL(uri, typeof window !== 'undefined' ? window.location.href : 'http://local')
  const preview = url.hash ? new URLSearchParams(url.hash.slice(1)).get('rm_preview') : null
  const blur = url.hash ? new URLSearchParams(url.hash.slice(1)).get('rm_blur') === '1' : false

  if (loading && !allowed) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!allowed) {
    // show preview (if any), blurred if flag set
    if (preview) {
      return (
        <div className={`overflow-hidden rounded-xl border border-white/10 ${blur ? 'blur-md' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="preview" className="w-full object-cover" />
          <div className="p-2 text-xs text-slate-300">Locked — subscribe or purchase to unlock.</div>
        </div>
      )
    }
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-slate-300">
        <LockKeyhole className="h-5 w-5" />
        Locked — subscribe or purchase to unlock.
      </div>
    )
  }

  // Unlocked: show main content URI (image/video/basic)
  const isImg = uri.startsWith('ipfs://') || uri.match(/\.(png|jpe?g|webp|gif|mp4|mov|m4v|webm)(\?|#|$)/i)
  if (isImg && /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(uri)) {
    return (
      <video src={uri} controls playsInline className="w-full rounded-xl border border-white/10" />
    )
  }
  if (isImg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={uri} alt="post" className="w-full rounded-xl border border-white/10" />
  }
  return (
    <a href={uri} target="_blank" className="text-cyan-300 underline">
      Open content
    </a>
  )
}
