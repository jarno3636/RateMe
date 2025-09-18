// /app/creator/[id]/dashboard/page.tsx
"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import toast from "react-hot-toast"
import { useAccount } from "wagmi"

import { useGetProfile, useUpdateProfile } from "@/hooks/useProfileRegistry"
import {
  useCreatorPlanIds,
  useCreatorPostIds,
  usePlan,
  usePost,
  useCreatePlan,
  useCreatePost,
} from "@/hooks/useCreatorHub"
import { useAverage, useRatingStats } from "@/hooks/useRatings"

const USDC = process.env.NEXT_PUBLIC_USDC as `0x${string}` | undefined
const AVATAR_FALLBACK = "/avatar.png"

/* ---------- utils ---------- */
function toUnits6(n: number) { return BigInt(Math.round(n * 1_000_000)) }
function numberOr(v: unknown, d: number) {
  const n = typeof v === "string" ? Number(v) : Number(v ?? NaN)
  return Number.isFinite(n) ? n : d
}
function isSameAddr(a?: string, b?: string) { return !!a && !!b && a.toLowerCase() === b.toLowerCase() }

/* ---------- atoms ---------- */
function Badge({
  label,
  tone = "pink",
  title,
}: {
  label: string
  tone?: "pink" | "green" | "slate" | "amber" | "blue"
  title?: string
}) {
  const tones: Record<string, string> = {
    pink:  "border-pink-500/50 text-pink-200",
    green: "border-emerald-500/50 text-emerald-200",
    slate: "border-white/20 text-white/80",
    amber: "border-amber-500/50 text-amber-200",
    blue:  "border-sky-500/50 text-sky-200",
  }
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] ${tones[tone] || tones.pink}`}
    >
      {label}
    </span>
  )
}

/** Avatar with built-in fallback */
function Avatar({
  src,
  alt = "",
  className = "",
}: {
  src?: string
  alt?: string
  className?: string
}) {
  const [fallback, setFallback] = useState(false)
  const finalSrc = !fallback && (src || "").trim() ? (src as string) : AVATAR_FALLBACK
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFallback(true)}
    />
  )
}

/* ===================== Page ===================== */
export default function CreatorDashboardPage() {
  const params = useParams<{ id: string }>()
  const id = useMemo(() => { try { return BigInt(params.id) } catch { return 0n } }, [params.id])

  const { address } = useAccount()

  /** Profile */
  const { data: prof, refetch: refetchProfile } = useGetProfile(id)
  const { update, isPending: savingProfile } = useUpdateProfile()

  const owner  = (prof?.[0] as `0x${string}` | undefined) ?? undefined
  const handle = String(prof?.[1] ?? "")
  const name   = String(prof?.[2] ?? "")
  const avatar = String(prof?.[3] ?? "")
  const bio    = String(prof?.[4] ?? "")
  const fid    = (prof?.[5] as bigint) ?? 0n

  const isOwner = isSameAddr(owner, address)

  /** ---------- Edit profile ---------- */
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(name)
  const [avatarURI, setAvatarURI] = useState(avatar)
  const [bioText, setBioText] = useState(bio)
  const [fidNum, setFidNum] = useState<string>(fid ? String(fid) : "")

  useEffect(() => {
    setDisplayName(name)
    setAvatarURI(avatar)
    setBioText(bio)
    setFidNum(fid ? String(fid) : "")
  }, [name, avatar, bio, fid])

  const saveProfile = useCallback(async () => {
    try {
      if (!isOwner) return toast.error("You don't own this profile")
      const fidBig = fidNum ? BigInt(fidNum) : 0n
      await update(id, displayName.trim(), avatarURI.trim(), bioText, fidBig)
      toast.success("Profile updated")
      setEditing(false)
      refetchProfile()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to update profile")
    }
  }, [isOwner, fidNum, update, id, displayName, avatarURI, bioText, refetchProfile])

  /** ---------- Plans ---------- */
  const { data: planIds, refetch: refetchPlans } = useCreatorPlanIds(owner ?? undefined)
  const { createPlan, isPending: creatingPlan } = useCreatePlan()

  const [planName, setPlanName] = useState("")
  const [planPrice, setPlanPrice] = useState("") // USDC
  const [planDays, setPlanDays] = useState("30")
  const [planMeta, setPlanMeta] = useState("")

  const submitPlan = useCallback(async () => {
    try {
      if (!isOwner) return toast.error("Connect as the profile owner")
      if (!USDC) return toast.error("USDC address not configured")
      const priceUnits = toUnits6(numberOr(planPrice, 0))
      if (priceUnits < 0n) return toast.error("Price must be ≥ 0")
      const days = Math.max(1, numberOr(planDays, 30))
      await createPlan(USDC, priceUnits, days, (planName || "Plan").trim(), (planMeta || "").trim())
      toast.success("Plan created")
      setPlanName(""); setPlanPrice(""); setPlanDays("30"); setPlanMeta("")
      refetchPlans()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to create plan")
    }
  }, [isOwner, planPrice, planDays, planName, planMeta, refetchPlans])

  /** ---------- Posts ---------- */
  const { data: postIds, refetch: refetchPosts } = useCreatorPostIds(owner ?? undefined)
  const { createPost, isPending: creatingPost } = useCreatePost()

  const [postURI, setPostURI] = useState("")
  const [postPrice, setPostPrice] = useState("") // USDC
  const [postSubGate, setPostSubGate] = useState(false)

  const submitPost = useCallback(async () => {
    try {
      if (!isOwner) return toast.error("Connect as the profile owner")
      if (!USDC) return toast.error("USDC address not configured")
      const priceUnits = toUnits6(numberOr(postPrice, 0))
      if (priceUnits < 0n) return toast.error("Price must be ≥ 0")
      await createPost(USDC, priceUnits, postSubGate, (postURI || "").trim())
      toast.success("Post created")
      setPostURI(""); setPostPrice(""); setPostSubGate(false)
      refetchPosts()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to create post")
    }
  }, [isOwner, postPrice, postSubGate, postURI, refetchPosts])

  /** ---------- Stats ---------- */
  const { data: avgX100 } = useAverage(owner ?? undefined)
  const { data: stat } = useRatingStats(owner ?? undefined)
  const ratingAvg = avgX100 ? Number(avgX100) / 100 : 0
  const ratingCount = stat ? Number((stat as any)?.[0] ?? 0) : 0

  // mock server stats (kept as-is; fetches client-side)
  const [subs, setSubs] = useState(0)
  const [sales, setSales] = useState(0)
  const [mrr, setMrr] = useState(0)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const r = await fetch(`/api/creator-stats?id=${params.id}`, { cache: "no-store" })
        if (!r.ok) throw new Error("no stats")
        const j = await r.json()
        if (!ignore) {
          setSubs(Number(j.subs ?? 0))
          setSales(Number(j.sales ?? 0))
          setMrr(Number(j.mrr ?? 0))
        }
      } catch {
        if (!ignore) { setSubs(0); setSales(0); setMrr(0) }
      }
    })()
    return () => { ignore = true }
  }, [params.id])

  /* ---------- role-aware header badges ---------- */
  const hasPlans = ((planIds as bigint[]) ?? []).length > 0
  const headerBadges = (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge label="Creator (You)" tone="pink" />
      {hasPlans && <Badge label="Pro" tone="amber" title="You offer paid subscriptions/content" />}
      {subs > 0 && <Badge label="Earning" tone="green" title="You have active subscribers" />}
      {ratingCount > 0 && <Badge label={`Rated ${ratingAvg.toFixed(2)}`} tone="blue" title="Average rating" />}
    </div>
  )

  const profileUrl = `/creator/${params.id}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="card flex items-center gap-4">
        <Avatar
          src={avatar}
          alt=""
          className="h-16 w-16 rounded-full object-cover ring-1 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-2xl font-semibold">{name || `Profile #${params.id}`}</div>
            {headerBadges}
          </div>
          <div className="truncate opacity-70">@{handle}</div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={profileUrl} className="btn" title="Open your public profile">
            View public
          </Link>
          {isOwner && (
            <button
              className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Cancel" : "Edit profile"}
            </button>
          )}
        </div>
      </section>

      {/* Edit profile */}
      {editing && isOwner && (
        <section className="card space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Display name</div>
              <input
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
                value={displayName}
                onChange={(e)=>setDisplayName(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Avatar URI</div>
              <input
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
                value={avatarURI}
                onChange={(e)=>setAvatarURI(e.target.value)}
                placeholder="https://... or ipfs://..."
              />
            </label>
          </div>
          <label className="block">
            <div className="mb-1 text-sm opacity-70">Bio</div>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
              value={bioText}
              onChange={(e)=>setBioText(e.target.value)}
            />
          </label>
          <label className="block max-w-xs">
            <div className="mb-1 text-sm opacity-70">Farcaster FID (optional)</div>
            <input
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
              value={fidNum}
              onChange={(e)=>setFidNum(e.target.value)}
              inputMode="numeric"
            />
          </label>

          <div className="flex justify-end">
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10 disabled:opacity-50"
            >
              {savingProfile ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="grid gap-3 md:grid-cols-4">
        <div className="card">
          <div className="text-sm opacity-70">Subscribers</div>
          <div className="text-2xl font-semibold">{subs}</div>
        </div>
        <div className="card">
          <div className="text-sm opacity-70">Post sales</div>
          <div className="text-2xl font-semibold">{sales}</div>
        </div>
        <div className="card">
          <div className="text-sm opacity-70">MRR (USDC)</div>
          <div className="text-2xl font-semibold">{mrr}</div>
        </div>
        <div className="card">
          <div className="text-sm opacity-70">Rating avg · count</div>
          <div className="text-2xl font-semibold">
            {ratingAvg ? ratingAvg.toFixed(2) : "-"}{" "}
            <span className="text-sm opacity-70">({ratingCount})</span>
          </div>
        </div>
      </section>

      {/* Posts manager */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Create post</h2>
        <div className="card space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Content URI</div>
              <input
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
                value={postURI}
                onChange={(e)=>setPostURI(e.target.value)}
                placeholder="https://blob.vercel-storage.com/..."
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Price (USDC)</div>
              <input
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
                value={postPrice}
                onChange={(e)=>setPostPrice(e.target.value)}
                placeholder="0.00 for free"
                inputMode="decimal"
              />
            </label>
          </div>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={postSubGate} onChange={(e)=>setPostSubGate(e.target.checked)} />
            <span className="text-sm">Gate by active subscription</span>
          </label>
          <div className="flex justify-end">
            <button
              onClick={submitPost}
              disabled={creatingPost}
              className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10 disabled:opacity-50"
            >
              {creatingPost ? "Creating…" : "Create post"}
            </button>
          </div>
        </div>

        <h3 className="text-lg font-medium">Your posts</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {((postIds as bigint[]) ?? []).length === 0 && (
            <div className="card opacity-70">No posts yet.</div>
          )}
          {(postIds as bigint[] | undefined)?.map((pid) => (
            <PostRow key={`${pid}`} id={pid} />
          ))}
        </div>
      </section>

      {/* Plans manager */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Create subscription plan</h2>
        <div className="card space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Plan name</div>
              <input
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
                value={planName}
                onChange={(e)=>setPlanName(e.target.value)}
                placeholder="Monthly"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Price per period (USDC)</div>
              <input
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
                value={planPrice}
                onChange={(e)=>setPlanPrice(e.target.value)}
                placeholder="e.g. 5.00"
                inputMode="decimal"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Period (days)</div>
              <input
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
                value={planDays}
                onChange={(e)=>setPlanDays(e.target.value)}
                placeholder="30"
                inputMode="numeric"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Metadata URI (optional)</div>
              <input
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
                value={planMeta}
                onChange={(e)=>setPlanMeta(e.target.value)}
                placeholder="ipfs://..., https://..., etc."
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              onClick={submitPlan}
              disabled={creatingPlan}
              className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10 disabled:opacity-50"
            >
              {creatingPlan ? "Creating…" : "Create plan"}
            </button>
          </div>
        </div>

        <h3 className="text-lg font-medium">Your plans</h3>
        <div className="grid gap-3">
          {((planIds as bigint[]) ?? []).length === 0 && (
            <div className="card opacity-70">No plans yet.</div>
          )}
          {(planIds as bigint[] | undefined)?.map((plid) => (
            <PlanRow key={`${plid}`} id={plid} />
          ))}
        </div>
      </section>
    </div>
  )
}

/* ---------- Small subcomponents ---------- */

function PlanRow({ id }: { id: bigint }) {
  const { data: plan } = usePlan(id)
  // plans -> [creator, token, pricePerPeriod, periodDays, active, name, metadataURI]
  const price  = BigInt(plan?.[2] ?? 0n)
  const days   = Number(plan?.[3] ?? 30)
  const active = Boolean(plan?.[4] ?? true)
  const name   = String(plan?.[5] ?? "Plan")

  const softDelete = async () => {
    try {
      const r = await fetch("/api/content/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: id.toString(), kind: "plan" }),
      })
      if (!r.ok) throw new Error(await r.text())
      toast.success("Plan marked as deleted")
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    }
  }

  return (
    <div className="card flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          <Badge label={active ? "Active" : "Inactive"} tone={active ? "green" : "slate"} />
        </div>
        <div className="text-sm opacity-70">
          {(Number(price) / 1e6).toFixed(2)} USDC / {days}d
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs rounded-full border border-white/10 px-3 py-1 opacity-70">#{id.toString()}</div>
        <button className="btn" onClick={softDelete} title="Soft-delete (KV mark)">Delete</button>
      </div>
    </div>
  )
}

function PostRow({ id }: { id: bigint }) {
  const { data: post } = usePost(id)
  // posts -> [creator, token, price, active, accessViaSub, uri]
  const price   = BigInt(post?.[2] ?? 0n)
  const active  = Boolean(post?.[3] ?? true)
  const subGate = Boolean(post?.[4] ?? false)
  const uri     = String(post?.[5] ?? "")

  const softDelete = async () => {
    try {
      const r = await fetch("/api/content/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: id.toString(), kind: "post" }),
      })
      if (!r.ok) throw new Error(await r.text())
      toast.success("Post marked as deleted")
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    }
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Post #{id.toString()}</span>
          <Badge label={subGate ? "Subscriber" : price === 0n ? "Free" : "Paid"} tone={subGate ? "green" : price === 0n ? "slate" : "amber"} />
          {!active && <Badge label="Inactive" tone="slate" />}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm opacity-70">{(Number(price)/1e6).toFixed(2)} USDC</div>
          <button className="btn" onClick={softDelete} title="Soft-delete (KV mark)">Delete</button>
        </div>
      </div>
      <div className="truncate text-sm opacity-70">{uri || "(no uri set)"}</div>
    </div>
  )
}
