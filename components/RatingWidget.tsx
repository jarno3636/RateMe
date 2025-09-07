// components/RatingWidget.tsx
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Star } from 'lucide-react'

type Props = { creatorId: string }

type RatingState = {
  avg: number
  count: number
  items: Array<{ score: number; comment?: string; at: number }>
}

export default function RatingWidget({ creatorId }: Props) {
  const id = useMemo(() => creatorId.toLowerCase().replace(/^@/, ''), [creatorId])
  const [data, setData] = useState<RatingState | null>(null)
  const [score, setScore] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  async function load() {
    const res = await fetch(`/api/ratings/${encodeURIComponent(id)}`, { cache: 'no-store' })
    const json = await res.json()
    setData(json)
  }

  useEffect(() => { load() }, [id])

  const submit = () => {
    if (score < 1 || score > 5) return
    setError(null)
    setOkMsg(null)
    startTransition(async () => {
      const res = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creatorId: id, score, comment }),
      })
      const json = await res.json()
      if (!json.ok) {
        setError(json.error || 'Something went wrong.')
        return
      }
      setOkMsg('Thanks for rating!')
      setComment('')
      setScore(0)
      load()
    })
  }

  const display = (hover || score)

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Rate this creator</div>
          <div className="text-xs text-slate-400">
            Average {data?.avg ?? 0} / 5 · {data?.count ?? 0} ratings
          </div>
        </div>
        <div className="flex items-center gap-1" aria-label="Your rating" role="radiogroup">
          {[1,2,3,4,5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setScore(n)}
              className="rounded p-1 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              title={`${n} star${n>1?'s':''}`}
            >
              <Star className={`h-6 w-6 ${display >= n ? 'fill-yellow-300 text-yellow-300' : 'text-slate-400'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs text-slate-400 mb-1" htmlFor="cmt">Optional comment</label>
        <textarea
          id="cmt"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={280}
          placeholder="What did you like? What can improve?"
          className="w-full rounded-lg border border-white/10 bg-transparent p-2 text-sm outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button disabled={pending || score === 0} onClick={submit} className="btn">
          {pending ? 'Sending…' : 'Submit rating'}
        </button>
        {error && <span className="text-sm text-rose-300">{error}</span>}
        {okMsg && <span className="text-sm text-emerald-300">{okMsg}</span>}
      </div>

      {!!(data?.items?.length) && (
        <div className="mt-4 space-y-2">
          {data!.items.slice(0,3).map((r, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="flex items-center gap-1 text-xs">
                {[1,2,3,4,5].map((n)=>(
                  <Star key={n} className={`h-3.5 w-3.5 ${r.score >= n ? 'fill-yellow-300 text-yellow-300' : 'text-slate-500'}`} />
                ))}
                <span className="ml-2 text-slate-500">
                  {new Date(r.at).toLocaleDateString()}
                </span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-slate-300">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
