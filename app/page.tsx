// /app/page.tsx
import Link from "next/link"
import { headers } from "next/headers"
import { computeTop3 } from "@/lib/top3"
import { getProfileSnaps } from "@/lib/profileCache"
import { publicClient } from "@/lib/chain"
import RatingsAbi from "@/abi/Ratings.json"
import { creatorShareLinks } from "@/lib/farcaster"

const AVATAR_FALLBACK = "/avatar.png"
const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}` | undefined

async function getOrigin() {
  try {
    const h = headers()
    const proto = h.get("x-forwarded-proto") ?? "https"
    const host = h.get("x-forwarded-host") ?? h.get("host")
    if (host) return `${proto}://${host}`
  } catch {}
  return ""
}

async function getTop3Ids(): Promise<number[]> {
  // Try the API first (KV-cached), then deterministic on-chain fallback.
  try {
    const origin = await getOrigin()
    const url = origin ? `${origin}/api/top3` : `/api/top3`
    const r = await fetch(url, { cache: "no-store" })
    if (!r.ok) throw new Error(`top3 api: ${r.status}`)
    const j = await r.json()
    if (Array.isArray(j.ids) && j.ids.length > 0) return j.ids
  } catch (e) {
    console.error("getTop3Ids api fallback:", e)
  }
  return await computeTop3(50)
}

/** Fetch average (x100) + count from Ratings for a list of owners, server-side. */
async function getRatingsForOwners(
  owners: `0x${string}`[]
): Promise<Record<string, { avgX100: number; count: number }>> {
  const out: Record<string, { avgX100: number; count: number }> = {}
  if (!RATINGS || owners.length === 0) return out

  await Promise.all(
    owners.map(async (owner) => {
      try {
        const [avg, stats] = await Promise.all([
          publicClient.readContract({
            address: RATINGS,
            abi: RatingsAbi as any,
            functionName: "getAverage",
            args: [owner],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: RATINGS,
            abi: RatingsAbi as any,
            functionName: "getStats",
            args: [owner],
          }) as Promise<[bigint, bigint]>, // [count, totalScore]
        ])
        const count = Number((stats?.[0] ?? 0n) as bigint)
        out[owner.toLowerCase()] = { avgX100: Number(avg ?? 0n), count: Number.isFinite(count) ? count : 0 }
      } catch {
        out[owner.toLowerCase()] = { avgX100: 0, count: 0 }
      }
    })
  )
  return out
}

// KV-backed profile snapshot fetch (server-side only)
async function getProfiles(ids: number[]) {
  if (!ids?.length) return []
  return getProfileSnaps(ids)
}

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const ids = await getTop3Ids()
  const profiles = await getProfiles(ids)

  // Ratings overlay (optional; graceful if RATINGS unset)
  const ratingsMap = await getRatingsForOwners(profiles.map((p) => p.owner))

  return (
    <div className="relative space-y-14">
      {/* Decorative background (motion-safe) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-8rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-pink-500/20 blur-[90px] motion-reduce:hidden" />
        <div className="absolute right-[-8rem] bottom-[-10rem] h-[26rem] w-[26rem] rounded-full bg-fuchsia-700/20 blur-[100px] motion-reduce:hidden" />
        <div className="absolute left-[-10rem] bottom-[-8rem] h-[22rem] w-[22rem] rounded-full bg-pink-400/10 blur-[100px] motion-reduce:hidden" />
      </div>

      {/* Hero */}
      <section className="card mx-auto max-w-4xl border-white/10 bg-white/5 p-8 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1 text-xs uppercase tracking-wide">
          <span className="inline-block h-2 w-2 rounded-full bg-pink-500" />
          Live on Base · USDC
        </div>

        <h1 className="mt-4 bg-gradient-to-br from-pink-400 via-pink-300 to-fuchsia-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
          OnlyStars
        </h1>

        <p className="mx-auto mt-3 max-w-2xl text-balance text-sm/6 opacity-80 md:text-base/7">
          Creator subscriptions, paid posts, and on-chain ratings — secured on{" "}
          <span className="font-medium text-pink-300">Base</span> with{" "}
          <span className="font-medium text-pink-300">USDC</span>. Instant, secure payouts. Ratings
          use small fees to keep the signal high and the spam low.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            className="rounded-full border border-pink-500/60 px-5 py-2 text-sm hover:bg-pink-500/10 focus-visible:ring-2 focus-visible:ring-pink-500/50"
            href="/discover"
          >
            Discover creators
          </Link>
          <Link
            className="rounded-full border border-pink-500/60 px-5 py-2 text-sm hover:bg-pink-500/10 focus-visible:ring-2 focus-visible:ring-pink-500/50"
            href="/creator"
          >
            Become a creator
          </Link>
        </div>

        {/* Key value props */}
        <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          <Feature
            title="Low platform fee"
            body="Just 1% platform fee. Keep more of what you earn."
            icon={<PercentIcon />}
          />
          <Feature
            title="Simple account setup"
            body="$0.50 USDC one-time profile creation."
            icon={<CoinIcon />}
          />
          <Feature
            title="Instant on-chain payments"
            body="Non-custodial USDC. You stay in control."
            icon={<BoltIcon />}
          />
          <Feature
            title="Anti-spam ratings"
            body="Micropayment per rating keeps feedback real."
            icon={<ShieldIcon />}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs opacity-75">
          <span className="rounded-full border border-white/10 px-3 py-1">Non-custodial</span>
          <span className="rounded-full border border-white/10 px-3 py-1">Creator-friendly terms</span>
          <span className="rounded-full border border-white/10 px-3 py-1">Built with wagmi + viem</span>
        </div>
      </section>

      {/* Top 3 creators */}
      <section className="mx-auto max-w-5xl space-y-5 px-4">
        <h2 className="text-center text-2xl font-semibold">Top creators</h2>

        {profiles.length === 0 ? (
          <div className="card mx-auto max-w-3xl text-center opacity-80">
            No leaderboard yet — be the first to create a profile and get rated.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => {
              const src = p.avatar?.trim() ? p.avatar : AVATAR_FALLBACK
              const name = p.name?.trim() ? p.name : `Profile #${p.id}`
              const handle = p.handle?.trim() ? p.handle : "unknown"
              const r = ratingsMap[p.owner.toLowerCase()] || { avgX100: 0, count: 0 }
              const avg = r.avgX100 > 0 ? (r.avgX100 / 100).toFixed(2) : "—"
              const countLabel = r.count === 1 ? "rating" : "ratings"

              const share = creatorShareLinks(String(p.id), `Check out @${handle} on OnlyStars`)
              return (
                <div
                  key={p.id}
                  className="group card relative overflow-hidden border-white/10 p-4"
                >
                  {/* Accent line */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-pink-500/0 via-pink-500/60 to-pink-500/0 opacity-80"
                  />

                  <Link href={`/creator/${p.id}`} className="flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-lg font-medium">{name}</div>
                      <div className="truncate text-sm opacity-70">@{handle}</div>
                    </div>
                  </Link>

                  {/* Rating + share */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs">
                      <StarIcon />
                      <span className="tabular-nums">{avg !== "—" ? `${avg} / 5` : "No ratings"}</span>
                      {avg !== "—" && (
                        <>
                          <span aria-hidden>•</span>
                          <span className="opacity-70">
                            {r.count} {countLabel}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={share.cast}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50"
                        title="Share on Warpcast"
                        aria-label="Share on Warpcast"
                      >
                        Warpcast
                      </a>
                      <a
                        href={share.tweet}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50"
                        title="Share on X"
                        aria-label="Share on X"
                      >
                        X
                      </a>
                    </div>
                  </div>

                  {/* subtle hover glow */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-1 -z-10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30"
                    style={{
                      background:
                        "radial-gradient(120px 60px at 20% 0%, rgba(236,72,153,0.35), transparent 70%)",
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA footer band */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="card relative overflow-hidden border-white/10 p-6 text-center">
          <h3 className="text-lg font-medium">Ready to shine?</h3>
          <p className="mx-auto mt-1 max-w-xl text-sm opacity-75">
            Set up your profile, publish a paid post or subscription, and invite your fans.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              className="rounded-full border border-pink-500/60 px-5 py-2 text-sm hover:bg-pink-500/10 focus-visible:ring-2 focus-visible:ring-pink-500/50"
              href="/creator"
            >
              Start creating
            </Link>
            <Link
              className="rounded-full border border-white/15 px-5 py-2 text-sm hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-pink-500/50"
              href="/discover"
            >
              Explore creators
            </Link>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 120% at 50% -10%, rgba(236,72,153,0.18), transparent 60%)",
            }}
          />
        </div>
      </section>
    </div>
  )
}

/* --- tiny inline icon components to keep it self-contained --- */
function PercentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90" aria-hidden="true">
      <path d="M19 5L5 19M8 8h.01M16 16h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CoinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90" aria-hidden="true">
      <ellipse cx="12" cy="7" rx="7" ry="3.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M5 7v10c0 1.9 3.5 3.5 7 3.5s7-1.6 7-3.5V7" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  )
}
function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4-2.7 7.5-7 9-4.3-1.5-7-5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" fill="currentColor" />
    </svg>
  )
}
function Feature({
  title,
  body,
  icon,
}: {
  title: string
  body: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="mt-1 text-pink-300">{icon}</div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs opacity-75">{body}</div>
      </div>
    </div>
  )
}
