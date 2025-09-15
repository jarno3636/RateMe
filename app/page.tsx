// /app/page.tsx
import Link from 'next/link'
import ProfileRegistry from '@/abi/ProfileRegistry.json'
import { publicClient } from '@/lib/chain'
import { computeTop3 } from '@/lib/top3'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`

async function getTop3Ids(): Promise<number[]> {
  try {
    const r = await fetch(`${SITE}/api/top3`, { cache: 'no-store' })
    if (!r.ok) throw new Error('bad')
    const j = await r.json()
    if (Array.isArray(j.ids) && j.ids.length > 0) return j.ids
  } catch {}
  // Fallback: compute from chain if KV empty/unavailable
  return await computeTop3(50)
}

async function getProfiles(ids: number[]) {
  if (ids.length === 0) return []
  // getProfilesFlat(uint256[]) -> packs arrays in same order
  const [outIds, owners, handles, names, avatars] = await publicClient.readContract({
    address: PROFILE_REGISTRY,
    abi: ProfileRegistry as any,
    functionName: 'getProfilesFlat',
    args: [ids.map(BigInt)],
  }) as unknown as [bigint[], string[], string[], string[], string[]]
  return outIds.map((id, i) => ({
    id: Number(id),
    owner: owners[i],
    handle: handles[i],
    name: names[i],
    avatar: avatars[i],
  }))
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const ids = await getTop3Ids()
  const profiles = await getProfiles(ids)

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="card">
        <h1 className="mb-2 text-4xl font-bold">OnlyStars</h1>
        <p className="max-w-2xl opacity-80">
          Creator subscriptions, paid posts, and on-chain ratings on Base using USDC.
          Connect, support, and rate your favorite creators—all in one place.
        </p>
        <div className="mt-5 flex gap-3">
          <Link className="btn" href="/discover">Discover creators</Link>
          <Link className="btn" href="/creator">Become a creator</Link>
        </div>
      </section>

      {/* Top 3 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Top creators</h2>
        {profiles.length === 0 ? (
          <div className="opacity-70">No leaderboard yet—be the first to create a profile and get rated.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <Link key={p.id} href={`/creator/${p.id}`} className="card hover:bg-white/10">
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.avatar || '/favicon.ico'}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-lg font-medium">{p.name || `Profile #${p.id}`}</div>
                    <div className="text-sm opacity-70">@{p.handle}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
