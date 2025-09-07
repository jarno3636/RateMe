// app/creator/[id]/subscribe/page.tsx
import Link from 'next/link'

export default function SubscribePage({ params }: { params: { id: string } }) {
  const id = (params.id || '').replace(/^@/, '')
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Subscribe to @{id}</h1>
      <p className="mt-2 text-slate-300">Plans & checkout are coming next. For now, head back to the profile.</p>
      <div className="mt-4">
        <Link href={`/creator/${id}`} className="btn">Back to profile</Link>
      </div>
    </main>
  )
}
