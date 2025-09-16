// /app/page.tsx
import Link from "next/link"
import { headers } from "next/headers"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import { publicClient } from "@/lib/chain"
import { computeTop3 } from "@/lib/top3"

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`

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

async function getProfiles(ids: number[]) {
  if (ids.length === 0) return []
  try {
    const res = (await publicClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "getProfilesFlat",
      args: [ids.map(BigInt)],
    })) as unknown as [
      bigint[],
      string[],
      string[],
      string[],
      string[],
      string[],
      bigint[],
      bigint[]
    ]

    const outIds = res?.[0] ?? []
    const owners = res?.[1] ?? []
    const handles = res?.[2] ?? []
    const names = res?.[3] ?? []
    const avatars = res?.[4] ?? []

    return outIds.map((id, i) => ({
      id: Number(id),
      owner: owners[i],
      handle: String(handles[i] ?? ""),
      name: String(names[i] ?? `Profile #${Number(id)}`),
      avatar: String(avatars[i] ?? ""),
    }))
  } catch (e) {
    console.error("getProfiles error:", e)
    return []
  }
}

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const ids = await getTop3Ids()
  const profiles = await getProfiles(ids)

  return (
    <div className="relative space-y-12">
      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-8rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-pink-500/20 blur-[90px]" />
        <div className="absolute right-[-8rem] bottom-[-10rem] h-[26rem] w-[26rem] rounded-full bg-fuchsia-700/20 blur-[100px]" />
        <div className="absolute left-[-10rem] bottom-[-8rem] h-[22rem] w-[22rem] rounded-full bg-pink-400/10 blur-[100px]" />
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
          Creator subscriptions, paid posts, and on-chain ratings—secured on{" "}
          <span className="font-medium text-pink-300">Base</span> with{" "}
          <span className="font-medium text-pink-300">USDC</span>. Discover, support, and rate your
          favorite creators in one beautiful place.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            className="rounded-full border border-pink-500/50 px-5 py-2 text-sm hover:bg-pink-500/10"
            href="/discover"
          >
            Discover creators
          </Link>
          <Link
            className="rounded-full border border-pink-500/50 px-5 py-2 text-sm hover:bg-pink-500/10"
            href="/creator"
          >
            Become a creator
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs opacity-70">
          <div className="rounded-full border border-white/10 px-3 py-1">On-chain reads</div>
          <div className="rounded-full border border-white/10 px-3 py-1">USDC payments</div>
          <div className="rounded-full border border-white/10 px-3 py-1">Ratings with micro-fees</div>
          <div className="rounded-full border border-white/10 px-3 py-1">Vercel storage</div>
        </div>
      </section>

      {/* Top 3 creators */}
      <section className="mx-auto max-w-5xl space-y-5 px-4">
        <h2 className="text-center text-2xl font-semibold">Top creators</h2>

        {profiles.length === 0 ? (
          <div className="card mx-auto max-w-3xl text-center opacity-80">
            No leaderboard yet—be the first to create a profile and get rated.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <Link
                key={p.id}
                href={`/creator/${p.id}`}
                className="group card relative overflow-hidden border-white/10 p-4 hover:bg-white/10"
              >
                {/* Accent line */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-pink-500/0 via-pink-500/60 to-pink-500/0 opacity-80"
                />

                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.avatar || "/favicon.ico"}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-lg font-medium">
                      {p.name || `Profile #${p.id}`}
                    </div>
                    <div className="truncate text-sm opacity-70">@{p.handle}</div>
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
              </Link>
            ))}
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
              className="rounded-full border border-pink-500/50 px-5 py-2 text-sm hover:bg-pink-500/10"
              href="/creator"
            >
              Start creating
            </Link>
            <Link
              className="rounded-full border border-white/15 px-5 py-2 text-sm hover:bg-white/10"
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
