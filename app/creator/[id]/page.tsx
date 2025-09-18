// app/creator/[id]/page.tsx
"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAccount } from "wagmi"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

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
import { useSpendApproval } from "@/hooks/useSpendApproval"

import * as ADDR from "@/lib/addresses"
import ProfileRegistryAbi from "@/abi/ProfileRegistry.json"

import StatsSection from "@/components/StatsSection"
import CreatorContentManager from "@/components/CreatorContentManager"
import ShareBar from "@/components/ShareBar"
import EditProfileBox from "./EditProfileBox"
import RatingWidget from "@/components/RatingWidget"

const FALLBACK_AVATAR = "/avatar.png"
const HUB = ADDR.HUB
const pc = createPublicClient({ chain: base, transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) })

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

async function resolveHandleToId(handle: string): Promise<bigint> {
  try {
    const res = await pc.readContract({
      address: ADDR.REGISTRY as `0x${string}`,
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
  const price = (plan?.[2] as bigint | undefined) ?? 0n
  const days = Number(plan?.[3] ?? 30)
  const active = Boolean(plan?.[4] ?? true)
  const name = String(plan?.[5] ?? "Plan")

  const [periods, setPeriods] = useState(1)
  const { subscribe, isPending: subscribing } = useSubscribe()
  const { approveExact, hasAllowance, isPending: approving, status } = useSpendApproval(
    price > 0n && HUB ? HUB : undefined,
    price > 0n ? price : undefined
  )

  const subscribeFlow = async () => {
    if (!active || periods < 1) return
    if (price > 0n && !hasAllowance) await approveExact?.()
    await subscribe(id, periods)
  }

  return (
    <div className="card flex flex-wrap items-center gap-3">
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
            ? (subscribing ? "Subscribing…" : "Subscribe")
            : (status === "pending-tx" ? "Approving…" : "Approve & Subscribe")}
        </button>
      </div>
    </div>
  )
}

/* ---------- Posts ---------- */
function PostCard({ id, creator }: { id: bigint; creator: `0x${string}` }) {
  const { address } = useAccount()
  const { data: post } = usePost(id)

  const price = (post?.[2] as bigint | undefined) ?? 0n
  const active = Boolean(post?.[3] ?? true)
  const subGate = Boolean(post?.[4] ?? false)
  const uri = String(post?.[5] ?? "")

  const { data: hasSub } = useIsActive(address as `0x${string}` | undefined, creator)
  const { data: hasAccess } = useHasPostAccess(address as `0x${string}` | undefined, id)
  const canView = !!hasAccess || (!!hasSub && subGate) || (!subGate && price === 0n)

  const { buy, isPending: buying } = useBuyPost()
  const { approveExact, hasAllowance, isPending: approving, status } = useSpendApproval(
    price > 0n && HUB ? HUB : undefined,
    price > 0n ? price : undefined
  )

  const buyFlow = async () => {
    if (!active || price === 0n) return
    if (!hasAllowance) await approveExact?.()
    await buy(id)
  }

  return (
    <div className="card space-y-3">
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
              ? (buying ? "Buying…" : "Buy post")
              : (status === "pending-tx" ? "Approving…" : "Approve & Buy")}
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

  const creator = (prof?.[0] as `0x${string}` | undefined) ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
  const handle = String(prof?.[1] ?? "")
  const name = String(prof?.[2] ?? (id ? `Profile #${id}` : "Profile"))
  const avatar = String(prof?.[3] ?? "")
  const bio = String(prof?.[4] ?? "")

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
      {/* Header — responsive, no overlap */}
      <section className="card">
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

      {badId && <div className="card border-red-500/40 text-red-200">Invalid profile id.</div>}
      {profError && !profLoading && <div className="card border-red-500/40 text-red-200">Failed to load profile.</div>}
      {!profLoading && !prof && id > 0n && (
        <div className="card">
          Profile not found.{" "}
          <Link className="text-primary underline" href="/creator">
            Become a creator
          </Link>
        </div>
      )}

      {/* Rating widget (kept visible for public view, hidden for owner) */}
      {!isOwner && creator !== "0x0000000000000000000000000000000000000000" && (
        <section className="card">
          <RatingWidget creator={creator} owner={creator} />
        </section>
      )}

      {isOwner && editing && id > 0n && (
        <section className="card">
          <EditProfileBox
            creatorId={id.toString()}
            currentAvatar={avatar || FALLBACK_AVATAR}
            currentBio={bio || ""}
            onSaved={() => setEditing(false)}
          />
        </section>
      )}

      {/* Bio */}
      {bio && <section className="card whitespace-pre-wrap">{bio}</section>}

      {/* Stats for creator */}
      <StatsSection creator={creator} profileId={id} />

      {/* Owner-only content manager */}
      {isOwner && (
        <section className="card">
          <CreatorContentManager creator={creator} />
        </section>
      )}

      {/* Posts */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Posts</h2>
        {postsLoading && <div className="card">Loading posts…</div>}
        {!postsLoading && posts.length === 0 && (
          <div className="card opacity-70">No posts yet.</div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((pid) => (
            <PostCard key={`${pid}`} id={pid} creator={creator} />
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="space-y-3">
        <h2 className="text-xl font-semibold">Subscription plans</h2>
        {plansLoading && <div className="card">Loading plans…</div>}
        {!plansLoading && plans.length === 0 && (
          <div className="card opacity-70">No plans yet.</div>
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
