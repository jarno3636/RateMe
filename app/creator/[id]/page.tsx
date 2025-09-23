// app/creator/[id]/page.tsx
"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAccount } from "wagmi"

import { publicClient } from "@/lib/chain"
import * as ADDR from "@/lib/addresses"
import ProfileRegistryAbi from "@/abi/ProfileRegistry.json"

import { useGetProfile } from "@/hooks/useProfileRegistry"
import {
  useCreatorPlanIds,
  useCreatorPostIds,
  usePlan,
  usePost,
  useIsActive,
  useHasPostAccess,
  useSubscribe,
  useBuyPost,
} from "@/hooks/useCreatorHub"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

import StatsSection from "@/components/StatsSection"
import CreatorContentManager from "@/components/CreatorContentManager"
import ShareBar from "@/components/ShareBar"
import EditProfileBox from "./EditProfileBox"
import RatingWidget from "@/components/RatingWidget"
import toast from "react-hot-toast"

const FALLBACK_AVATAR = "/avatar.png"
const HUB = ADDR.HUB

/* ---------------- helpers ---------------- */
function normalizeIpfs(u?: string | null) {
  if (!u) return ""
  return u.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7)}` : u
}
function safeUrlPathname(u: string) {
  try { return new URL(u).pathname } catch { return u }
}
function isImg(u: string) {
  const p = safeUrlPathname(u)
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(p)
}
function isVideo(u: string) {
  const p = safeUrlPathname(u)
  return /\.(mp4|webm|ogg)$/i.test(p)
}
const fmt6 = (v: bigint) => (Number(v) / 1e6).toFixed(2)
const isNumericId = (s: string) => /^[0-9]+$/.test(s)
const mulSafe = (a: bigint, b: bigint) => a * b // (inputs are small; BigInt guards overflow)

/** Safely treat unknown payloads as array-like (prevents {} index errors) */
const asTuple = (a: unknown): readonly unknown[] => (Array.isArray(a) ? a : [])

/** Resolve a handle -> profile id via registry ABI */
async function resolveHandleToId(handle: string): Promise<bigint> {
  if (!ADDR.REGISTRY) return 0n
  try {
    const res = await publicClient.readContract({
      address: ADDR.REGISTRY,
      abi: ProfileRegistryAbi as any,
      functionName: "getProfileByHandle",
      args: [handle],
    })
    if (typeof res === "bigint") return res
    if (Array.isArray(res)) {
      const cand = (res as any[]).find((v) => typeof v === "bigint" && v > 0n)
      if (cand) return cand as bigint
    }
  } catch {}
  return 0n
}

/* ------------ tiny UI atoms ------------- */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />
}

function AvatarImg({
  src,
  size = 64,
  className = "",
  alt = "",
}: {
  src?: string
  size?: number
  className?: string
  alt?: string
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={normalizeIpfs(src) || FALLBACK_AVATAR}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ring-1 ring-white/10 ${className}`}
      loading="eager"
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement
        if (!el.src.endsWith(FALLBACK_AVATAR)) el.src = FALLBACK_AVATAR
      }}
    />
  )
}

function Badge({
  label,
  tone = "pink",
  title,
}: {
  label: string
  tone?: "pink" | "green" | "slate" | "amber"
  title?: string
}) {
  const tones: Record<string, string> = {
    pink:  "border-pink-500/50 text-pink-200",
    green: "border-emerald-500/50 text-emerald-200",
    slate: "border-white/20 text-white/80",
    amber: "border-amber-500/50 text-amber-200",
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

/* ---------- Plans ---------- */
function PlanRow({ id }: { id: bigint }) {
  const { data: plan } = usePlan(id)

  // ✅ Safely narrow before indexing
  const p = asTuple(plan)
  const price  = BigInt((p[2] as bigint) ?? 0n)
  const days   = Number(p[3] ?? 30)
  const active = Boolean(p[4] ?? true)
  const name   = String(p[5] ?? "Plan")

  const [periods, setPeriods] = useState(1)
  const totalCost = useMemo(() => mulSafe(price, BigInt(Math.max(1, periods))), [price, periods])

  const { subscribe, isPending: subscribing } = useSubscribe()

  // USDC approvals for HUB spender
  const { data: allowance } = useUSDCAllowance(HUB)
  const { approve, isPending: approving } = useUSDCApprove()
  const hasAllowance = (allowance ?? 0n) >= totalCost

  const subscribeFlow = useCallback(async () => {
    if (!active || periods < 1) return
    if (price > 0n) {
      if (!HUB) return toast.error("Missing HUB contract address")
      if (!hasAllowance) {
        const t = toast.loading("Approving USDC…")
        try {
          await approve(HUB, totalCost)
          toast.success("Approval confirmed")
        } catch (e: any) {
          toast.error(e?.shortMessage || e?.message || "Approval failed")
          toast.dismiss(t)
          return
        }
        toast.dismiss(t)
      }
    }
    const t2 = toast.loading("Subscribing…")
    try {
      await subscribe(id, Math.max(1, periods))
      toast.success("Subscription confirmed")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Subscription failed")
    } finally {
      toast.dismiss(t2)
    }
  }, [active, periods, price, id, approve, hasAllowance])

  return (
    <div className="card w-full max-w-2xl mx-auto flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{name}</div>
        <div className="text-sm opacity-70">
          {fmt6(price)} USDC / {days}d {active ? "" : "· inactive"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={periods}
          onChange={(e) => setPeriods(Math.max(1, Number(e.target.value) || 1))}
          className="w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-2"
          aria-label="Subscription periods"
        />
        <button
          className="btn"
          onClick={subscribeFlow}
          disabled={!active || approving || subscribing || (price > 0n && !HUB)}
          title={!HUB ? "Missing HUB contract address" : !active ? "Plan inactive" : ""}
        >
          {price === 0n
            ? "Subscribe"
            : hasAllowance
            ? (subscribing ? "Subscribing…" : `Subscribe (${fmt6(totalCost)} USDC)`)
            : (approving ? "Approving…" : `Approve & Subscribe (${fmt6(totalCost)} USDC)`)}
        </button>
      </div>
    </div>
  )
}

/* ---------- Posts ---------- */
function PostCard({ id, creator }: { id: bigint; creator: `0x${string}` }) {
  const { address } = useAccount()
  const { data: post } = usePost(id)

  // ✅ Safely narrow before indexing
  const p = asTuple(post)
  const price   = BigInt((p[2] as bigint) ?? 0n)
  const active  = Boolean(p[3] ?? true)
  const subGate = Boolean(p[4] ?? false)
  const uri     = String(p[5] ?? "")

  const { data: hasSub } = useIsActive(address as `0x${string}` | undefined, creator)
  const { data: hasAccess } = useHasPostAccess(address as `0x${string}` | undefined, id)
  const canView = !!hasAccess || (!!hasSub && subGate) || (!subGate && price === 0n)

  const { buy, isPending: buying } = useBuyPost()

  // USDC approvals for HUB spender
  const { data: allowance } = useUSDCAllowance(HUB)
  const { approve, isPending: approving } = useUSDCApprove()
  const hasAllowance = (allowance ?? 0n) >= price

  const buyFlow = useCallback(async () => {
    if (!active || price === 0n) return
    if (!HUB) return toast.error("Missing HUB contract address")
    try {
      if (!hasAllowance) {
        const t = toast.loading("Approving USDC…")
        await approve(HUB, price)
        toast.dismiss(t)
        toast.success("Approval confirmed")
      }
      const t2 = toast.loading("Buying post…")
      await buy(id)
      toast.dismiss(t2)
      toast.success("Purchase complete")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Purchase failed")
    }
  }, [active, price, hasAllowance, approve, buy, id])

  return (
    <div className="card w-full max-w-md mx-auto space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">Post #{id.toString()}</div>
        <div className="flex items-center gap-2 text-sm opacity-80">
          {subGate ? <Badge label="Subscriber" tone="green" /> : price === 0n ? <Badge label="Free" tone="slate" /> : <Badge label="Paid" tone="amber" />}
          {!active && <Badge label="Inactive" tone="slate" />}
          <span className="opacity-70">· {fmt6(price)} USDC</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative overflow-hidden rounded-xl border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {isImg(uri) ? (
          <img
            src={uri}
            alt=""
            className={`h-auto w-full ${canView ? "" : "blur-sm"}`}
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
          />
        ) : isVideo(uri) ? (
          <video
            src={uri}
            className={`h-auto w-full ${canView ? "" : "blur-sm"}`}
            controls={canView}
            playsInline
            preload={canView ? "metadata" : "none"}
          />
        ) : (
          <div className={`block bg-black/40 p-4 ${canView ? "" : "blur-sm"}`}>Post content</div>
        )}

        {!canView && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <div className="rounded-full border border-white/20 px-3 py-1 text-xs">Locked</div>
          </div>
        )}
      </div>

      {!canView && price > 0n && !subGate && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn"
            onClick={buyFlow}
            disabled={!active || approving || buying || !HUB}
            title={!HUB ? "Missing HUB contract address" : !active ? "Post inactive" : ""}
          >
            {hasAllowance
              ? (buying ? "Buying…" : `Buy post (${fmt6(price)} USDC)`)
              : (approving ? "Approving…" : `Approve & Buy (${fmt6(price)} USDC)`)}
          </button>
        </div>
      )}

      {!canView && subGate && (
        <div className="flex">
          <Link className="btn" href="#plans">See plans</Link>
        </div>
      )}
    </div>
  )
}

/* ---------- Page ---------- */
function CreatorPublicPageImpl() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const rawParam = String(params.id || "").trim()

  // If it's a handle, resolve -> redirect to numeric route.
  useEffect(() => {
    if (!rawParam || isNumericId(rawParam)) return
    ;(async () => {
      const id = await resolveHandleToId(rawParam.replace(/^@/, ""))
      if (id > 0n) router.replace(`/creator/${id.toString()}`)
    })()
  }, [rawParam, router])

  // Parse numeric id
  const id = useMemo(() => {
    if (!rawParam || !isNumericId(rawParam)) return 0n
    try { return BigInt(rawParam) } catch { return 0n }
  }, [rawParam])

  // Profile read
  const { data: prof, isLoading: profLoading, error: profError } = useGetProfile(id)

  // ✅ Safely narrow profile tuple before indexing
  const t = asTuple(prof)
  const creator = (t[0] as `0x${string}` | undefined) ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
  const handle  = String(t[1] ?? "")
  const name    = String(t[2] ?? (id ? `Profile #${id}` : "Profile"))
  const avatar  = String(t[3] ?? "")
  const bio     = String(t[4] ?? "")

  const { data: planIds, isLoading: plansLoading } = useCreatorPlanIds(creator)
  const { data: postIds, isLoading: postsLoading } = useCreatorPostIds(creator)
  const plans = (planIds as bigint[] | undefined) ?? []
  const posts = (postIds as bigint[] | undefined) ?? []

  const { address } = useAccount()
  const isOwner = !!address && !!creator && address.toLowerCase() === (creator as string).toLowerCase()
  const [editing, setEditing] = useState(false)

  const badId = rawParam && isNumericId(rawParam) && id === 0n

  // For role-aware header badge (Subscriber)
  const { data: viewerHasSub } = useIsActive(address as `0x${string}` | undefined, creator)

  // Decide header badge
  const headerBadge =
    isOwner
      ? <Badge label="Creator" tone="pink" title="You own this profile" />
      : viewerHasSub
      ? <Badge label="Subscriber" tone="green" title="You have an active subscription" />
      : plans.length > 0
      ? <Badge label="Pro" tone="amber" title="Creator offers paid content" />
      : <Badge label="New" tone="slate" title="New or free creator" />

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4">
      {/* Header — centered card */}
      <section className="card w-full max-w-2xl mx-auto">
        {profLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-2 h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto,1fr,auto] md:items-center">
            <div className="relative">
              <AvatarImg src={avatar || FALLBACK_AVATAR} size={64} alt="" />
              <span aria-hidden className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full bg-pink-500/80 ring-2 ring-black/80" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-2xl font-semibold">{name}</div>
                {headerBadge}
              </div>
              {handle && <div className="truncate opacity-70">@{handle}</div>}
              <div className="mt-3">
                <ShareBar creatorId={id.toString()} handle={handle || id.toString()} />
              </div>
            </div>

            {isOwner && id > 0n && (
              <div className="flex justify-start md:justify-end">
                <button
                  className="btn"
                  onClick={() => setEditing((v) => !v)}
                  title={editing ? "Close editor" : "Edit your profile"}
                >
                  {editing ? "Close Editor" : "Edit Profile"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {badId && <div className="card w-full max-w-2xl mx-auto border-red-500/40 text-red-200">Invalid profile id.</div>}
      {profError && !profLoading && <div className="card w-full max-w-2xl mx-auto border-red-500/40 text-red-200">Failed to load profile.</div>}
      {!profLoading && !prof && id > 0n && (
        <div className="card w-full max-w-2xl mx-auto">
          Profile not found.{" "}
          <Link className="text-primary underline" href="/creator">
            Become a creator
          </Link>
        </div>
      )}

      {/* Rating widget (public view) */}
      {!isOwner && creator !== "0x0000000000000000000000000000000000000000" && (
        <section className="card w-full max-w-2xl mx-auto">
          <RatingWidget creator={creator} owner={creator} />
        </section>
      )}

      {isOwner && editing && id > 0n && (
        <section className="card w-full max-w-2xl mx-auto">
          <EditProfileBox
            creatorId={id.toString()}
            currentAvatar={avatar || FALLBACK_AVATAR}
            currentBio={bio || ""}
            onSaved={() => setEditing(false)}
          />
        </section>
      )}

      {/* Bio */}
      {bio && <section className="card w-full max-w-2xl mx-auto whitespace-pre-wrap">{bio}</section>}

      {/* Stats for creator */}
      <section className="w-full max-w-2xl mx-auto">
        <StatsSection creator={creator} profileId={id} />
      </section>

      {/* Owner-only content manager */}
      {isOwner && (
        <section className="w-full max-w-2xl mx-auto">
          <CreatorContentManager creator={creator} />
        </section>
      )}

      {/* Posts */}
      <section className="w-full max-w-2xl mx-auto space-y-3">
        <h2 className="text-xl font-semibold">Posts</h2>
        {postsLoading && <div className="card w-full">Loading posts…</div>}
        {!postsLoading && posts.length === 0 && (
          <div className="card w-full opacity-70">No posts yet.</div>
        )}
        <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] justify-items-center">
          {posts.map((pid) => (
            <PostCard key={`${pid}`} id={pid} creator={creator} />
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="w-full max-w-2xl mx-auto space-y-3">
        <h2 className="text-xl font-semibold">Subscription plans</h2>
        {plansLoading && <div className="card w-full">Loading plans…</div>}
        {!plansLoading && plans.length === 0 && (
          <div className="card w-full opacity-70">No plans yet.</div>
        )}
        <div className="grid gap-4">
          {plans.map((plid) => (
            <PlanRow key={`${plid}`} id={plid} />
          ))}
        </div>
      </section>
    </div>
  )
}

/** Export as client-only to avoid SSR storage crashes (indexedDB, etc.) */
export default dynamic(() => Promise.resolve(CreatorPublicPageImpl), { ssr: false })
