// app/creator/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatorOnboard() {
  const [handle, setHandle] = useState('')
  const router = useRouter()

  const go = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = handle.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._-]/g, '')
    if (!clean) return
    router.push(`/creator/${clean}`)
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Become a Creator</h1>
      <p className="mt-2 text-slate-300">
        Pick a handle to set up your page. You can configure plans and posts later.
      </p>

      <form onSubmit={go} className="mt-5 space-y-3">
        <label className="block text-sm text-slate-400">Handle</label>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-slate-400">@</span>
          <input
            value={handle}
            onChange={(e)=>setHandle(e.target.value)}
            placeholder="yourname"
            className="flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 outline-none placeholder:text-slate-500"
          />
        </div>
        <button className="btn mt-2">Create my page</button>
      </form>
    </main>
  )
}
