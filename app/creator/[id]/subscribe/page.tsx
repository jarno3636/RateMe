// app/creator/[id]/subscribe/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCreator } from '@/lib/kv'
import ClientSubscribe from './ClientSubscribe'

export default async function SubscribePage({ params }: { params: { id: string } }) {
  const id = (params.id || '').replace(/^@/, '').toLowerCase()
  const creator = await getCreator(id)
  if (!creator) return notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-4 flex items-center gap-3">
        <img
          src={creator.avatarUrl || '/icon-192.png'}
          alt=""
          className="h-12 w-12 rounded-full ring-2 ring-white/10"
        />
        <div>
          <h1 className="text-2xl font-semibold">Support @{creator.handle}</h1>
          {creator.displayName && (
            <p className="text-sm text-slate-400">{creator.displayName}</p>
          )}
        </div>
        <div className="flex-1" />
        <Link href={`/creator/${creator.id}`} className="btn">Back to profile</Link>
      </header>

      {!creator.address ? (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-200">
          This creator doesn’t have an on-chain address set yet. Plans & posts will appear once it’s connected.
        </div>
      ) : (
        <ClientSubscribe creatorAddress={creator.address as `0x${string}`} />
      )}
    </main>
  )
}
