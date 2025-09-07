// app/creator/[id]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE } from '@/lib/config';
import { getCreator, getRatingSummary, getRecentRatings } from '@/lib/kv';
import ShareBar from '@/components/ShareBar';
import RateBox from '@/components/RateBox';
import { Star } from 'lucide-react';

type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = params.id.toLowerCase();
  const creator = await getCreator(id);
  const title = creator
    ? `${creator.displayName || creator.handle} (@${creator.handle}) — Rate Me`
    : `@${id} — Rate Me`;

  return {
    title,
    openGraph: {
      title,
      url: `${SITE}/creator/${id}`,
      images: [{ url: `${SITE}/miniapp-card.png`, width: 1200, height: 630 }]
    },
    twitter: { card: 'summary_large_image', images: [`${SITE}/miniapp-card.png`] }
  };
}

export default async function CreatorPage({ params }: Params) {
  const id = params.id.toLowerCase();
  const creator = await getCreator(id);
  if (!creator) return notFound();

  const rating = await getRatingSummary(id);
  const recent = await getRecentRatings(id);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Header */}
      <section className="flex items-center gap-4">
        <img
          src={creator.avatarUrl || '/icon-192.png'}
          alt=""
          className="h-16 w-16 rounded-full ring-2 ring-white/10"
        />
        <div>
          <div className="text-xl font-semibold">
            {creator.displayName || creator.handle}{' '}
            <span className="text-sm text-slate-400">@{creator.handle}</span>
          </div>
          {creator.bio ? <div className="text-sm text-slate-300">{creator.bio}</div> : null}
          <div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
            <Star className="h-4 w-4 text-yellow-400" />
            {rating.count ? `${rating.avg.toFixed(2)} • ${rating.count} ratings` : 'No ratings yet'}
          </div>
        </div>
        <div className="flex-1" />
        <ShareBar creatorId={creator.id} handle={creator.handle} />
      </section>

      {/* Plans / Posts are on-chain; you can render them when ready.
         For now we keep a placeholder explaining it’s blockchain-backed. */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-slate-300">
          On-chain plans & posts via CreatorMonetizationHub at{' '}
          <a
            href={`https://basescan.org/address/0x49b9a469d8867e29a4e6810aed4dad724317f606#code`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Base
          </a>
          . Connect wallet in the mini-app to subscribe or buy posts.
        </div>
      </section>

      {/* Ratings */}
      <section className="grid gap-4 md:grid-cols-2">
        <RateBox creatorId={creator.id} />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">Recent feedback</div>
          {!recent.length ? (
            <div className="mt-2 text-sm text-slate-400">No reviews yet.</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {recent.map((r) => (
                <li key={r.createdAt} className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="text-yellow-400">
                      {'★'.repeat(r.score)}{' '}
                      <span className="text-slate-400">{'★'.repeat(Math.max(0, 5 - r.score))}</span>
                    </div>
                    <div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  {r.comment ? <div className="mt-1 text-slate-200">{r.comment}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
