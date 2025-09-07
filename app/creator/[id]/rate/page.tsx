// app/creator/[id]/rate/page.tsx
import RatingWidget from '@/components/RatingWidget'

export default function RateOnly({ params }: { params: { id: string } }) {
  const id = (params.id || '').replace(/^@/, '')
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-center text-2xl font-bold">@{id}</h1>
      <p className="mt-1 text-center text-sm text-slate-400">Leave a quick rating for this creator.</p>
      <div className="mt-6">
        <RatingWidget creatorId={id} />
      </div>
    </main>
  )
}
