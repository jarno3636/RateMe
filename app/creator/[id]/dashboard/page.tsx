// /app/creator/[id]/dashboard/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
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

const USDC = process.env.NEXT_PUBLIC_USDC as `0x${string}`

function toUnits6(n: number) {
  return BigInt(Math.round(n * 1_000_000))
}
function numberOr<T>(v: any, d: T): T {
  const n = Number(v)
  return Number.isFinite(n) ? (n as any) : d
}

export default function CreatorDashboardPage() {
  const params = useParams<{ id: string }>()
  const id = useMemo(() => {
    try { return BigInt(params.id) } catch { return 0n }
  }, [params.id])

  const { address } = useAccount()
  const { data: prof, refetch: refetchProfile } = useGetProfile(id)
  const { update, isPending: savingProfile } = useUpdateProfile()

  const owner  = prof?.[0] as `0x${string}` | undefined
  const handle = String(prof?.[1] ?? "")
  const name   = String(prof?.[2] ?? "")
  const avatar = String(prof?.[3] ?? "")
  const bio    = String(prof?.[4] ?? "")
  const fid    = (prof?.[5] as bigint) ?? 0n

  const isOwner = owner && address && owner.toLowerCase() === address.toLowerCase()

  /* ---------- Edit profile ---------- */
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

  const saveProfile = async () => {
    try {
      if (!isOwner) return toast.error("You don't own this profile")
      const fidBig = fidNum ? BigInt(fidNum) : 0n
      await update(id, displayName, avatarURI, bioText, fidBig)
      toast.success("Profile updated")
      setEditing(false)
      refetchProfile()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to update profile")
    }
  }

  /* ---------- Plans ---------- */
  const { data: planIds, refetch: refetchPlans } = useCreatorPlanIds(owner)
  const { createPlan, isPending: creatingPlan } = useCreatePlan()

  const [planName, setPlanName] = useState("")
  const [planPrice, setPlanPrice] = useState("") // USDC
  const [planDays, setPlanDays] = useState("30")
  const [planMeta, setPlanMeta] = useState("")

  const submitPlan = async () => {
    try {
      if (!isOwner) return toast.error("Connect as the profile owner")
      const priceUnits = toUnits6(numberOr(planPrice, 0))
      if (priceUnits < 0n) return toast.error("Price must be ≥ 0")
      const days = numberOr(planDays, 30)
      await createPlan(USDC, priceUnits, days, planName || "Plan", planMeta || "")
      toast.success("Plan created")
      setPlanName(""); setPlanPrice(""); setPlanDays("30"); setPlanMeta("")
      refetchPlans()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to create plan")
    }
  }

  /* ---------- Posts ---------- */
  const { data: postIds, refetch: refetchPosts } = useCreatorPostIds(owner)
  const { createPost, isPending: creatingPost } = useCreatePost()

  const [postURI, setPostURI] = useState("")
  const [postPrice, setPostPrice] = useState("") // USDC
  const [postSubGate, setPostSubGate] = useState(false)

  const submitPost = async () => {
    try {
      if (!isOwner) return toast.error("Connect as the profile owner")
      const priceUnits = toUnits6(numberOr(postPrice, 0))
      if (priceUnits < 0n) return toast.error("Price must be ≥ 0")
      await createPost(USDC, priceUnits, postSubGate, postURI)
      toast.success("Post created")
      setPostURI(""); setPostPrice(""); setPostSubGate(false)
      refetchPosts()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to create post")
    }
  }

  /* ---------- Stats ---------- */
  const { data: avgX100 } = useAverage(owner)
  const { data: stat } = useRatingStats(owner)
  const ratingAvg = avgX100 ? Number(avgX100) / 100 : 0
  const ratingCount = stat ? Number((stat as any)?.[0] ?? 0) : 0

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
        if (!ignore) {
          setSubs(0); setSales(0); setMrr(0)
        }
      }
    })()
    return () => { ignore = true }
  }, [params.id])

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="card flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar || "/favicon.ico"} alt="" className="h-16 w-16 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-2xl font-semibold">{name || `Profile #${params.id}`}</div>
          <div className="truncate opacity-70">@{handle}</div>
        </div>
        {isOwner && (
          <button
            className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Cancel" : "Edit profile"}
          </button>
        )}
      </section>

      {/* Edit profile */}
      {editing && isOwner && (
        <section className="card space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Display name</div>
              <input className="w-full" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
            </label>
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Avatar URI</div>
              <input className="w-full" value={avatarURI} onChange={(e)=>setAvatarURI(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <div className="mb-1 text-sm opacity-70">Bio</div>
            <textarea className="min-h-[100px] w-full" value={bioText} onChange={(e)=>setBioText(e.target.value)} />
          </label>
          <label className="block max-w-xs">
            <div className="mb-1 text-sm opacity-70">Farcaster FID (optional)</div>
            <input className="w-full" value={fidNum} onChange={(e)=>setFidNum(e.target.value)} />
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
            {ratingAvg ? ratingAvg.toFixed(2) : "-"} <span className="text-sm opacity-70">({ratingCount})</span>
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
              <input className="w-full" value={postURI} onChange={(e)=>setPostURI(e.target.value)} placeholder="https://blob.vercel-storage.com/..." />
            </label>
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Price (USDC)</div>
              <input className="w-full" value={postPrice} onChange={(e)=>setPostPrice(e.target.value)} placeholder="0.00 for free" />
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
              <input className="w-full" value={planName} onChange={(e)=>setPlanName(e.target.value)} placeholder="Monthly" />
            </label>
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Price per period (USDC)</div>
              <input className="w-full" value={planPrice} onChange={(e)=>setPlanPrice(e.target.value)} placeholder="e.g. 5.00" />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Period (days)</div>
              <input className="w-full" value={planDays} onChange={(e)=>setPlanDays(e.target.value)} placeholder="30" />
            </label>
            <label className="block">
              <div className="mb-1 text-sm opacity-70">Metadata URI (optional)</div>
              <input className="w-full" value={planMeta} onChange={(e)=>setPlanMeta(e.target.value)} placeholder="ipfs://..., https://..., etc." />
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

  return (
    <div className="card flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm opacity-70">
          {(Number(price) / 1e6).toFixed(2)} USDC / {days}d {active ? "" : "· inactive"}
        </div>
      </div>
      <div className="text-xs rounded-full border border-white/10 px-3 py-1 opacity-70">#{id.toString()}</div>
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

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">Post #{id.toString()}</div>
        <div className="text-sm opacity-70">
          {subGate ? "Sub-gated" : (price === 0n ? "Free" : "Paid")} · {(Number(price)/1e6).toFixed(2)} USDC {active ? "" : "· inactive"}
        </div>
      </div>
      <div className="truncate text-sm opacity-70">{uri || "(no uri set)"}</div>
    </div>
  )
}
