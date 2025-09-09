// app/creator/[id]/rate/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import RatingWidget from '@/components/RatingWidget'
import { SITE } from '@/lib/config'
import { creatorShareLinks } from '@/lib/farcaster'

type Params = { params: { id: string } }

function siteUrl() {
  return (SITE || 'http://localhost:3000').replace(/\/$/, '')
}
function normalizeId(s: string) {
  return String(s || '').trim().replace(/^@/, '').toLowerCase()
}
function isValidId(id: string) {
  return !!id && id.length >= 3 && id.length <= 32 && /^[a-z0-9._-]+$/.test(id)
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = normalizeId(params.id)
  const site = siteUrl()
  const title = `Rate @${id} — Rate Me`
  const url = `${site}/creator/${encodeURIComponent(id)}/rate`
  const og = `${site}/api/og/creator?id=${encodeURIComponent(id)}`

  return {
    title,
    alternates: { canonical: url },
    openGraph: { title, url, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', images: [og], title },
  }
}

export default function RateOnly({ params }: Params) {
  const id = normalizeId(params.id)
  const valid = isValidId(id)

  const shares = creatorShareLinks(
    id,
    `Leave a quick rating for @${id} on Rate Me`
  )

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-bold">
          {valid ? `@${id}` : 'Invalid creator id'}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {valid
            ? 'Leave a quick rating for this creator.'
            : 'Handles must be 3–32 chars, a–z, 0–9, dot, underscore, or hyphen.'}
        </p>

        {valid && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <Link
              href={`/creator/${encodeURIComponent(id)}`}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
            >
              View full profile
            </Link>
            <a
              href={shares.cast}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
            >
              Cast this
            </a>
            <a
              href={shares.tweet}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
            >
              Tweet this
            </a>
          </div>
        )}
      </header>

      {valid ? (
        <div className="mt-6">
          <RatingWidget creatorId={id} />
          <p className="mt-3 text-center text-xs text-slate-400">
            Ratings are public. Be kind, specific, and constructive.
          </p>
        </div>
      ) : (
        <div className="mt-6 text-center">
          <Link
            href="/creator"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Go back
          </Link>
        </div>
      )}
    </main>
  )
}
