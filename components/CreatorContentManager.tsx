// components/CreatorContentManager.tsx
"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { useAccount } from "wagmi"
import {
  useCreatorPostIds,
  useCreatorPlanIds,
  usePost,
  usePlan,
  // create* come from base hook (they include token/metadata variants)
  useCreatePost as useCreatePostOnchain,
  useCreatePlan as useCreatePlanOnchain,
} from "@/hooks/useCreatorHub"
import {
  useUpdatePost,
  useUpdatePlan,
} from "@/hooks/useCreatorHubExtras"
import * as ADDR from "@/lib/addresses"

const MAX_IMAGE_BYTES = 1 * 1024 * 1024
const MAX_VIDEO_BYTES = 2 * 1024 * 1024

const isImg = (u: string) => !!u && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(u)
const isVideo = (u: string) => !!u && /\.(mp4|webm|ogg)$/i.test(u)
const fmt6 = (v: bigint) => (Number(v) / 1e6).toFixed(2)

function PriceInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (s: string) => void
  disabled?: boolean
}) {
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      placeholder="0.00"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-28 rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
    />
  )
}

export default function CreatorContentManager({ creator }: { creator: `0x${string}` }) {
  const { address } = useAccount()
  const isOwner = !!address && address.toLowerCase() === (creator as string).toLowerCase()

  const { data: postIds, isLoading: postsLoading, refetch: refetchPosts } = useCreatorPostIds(creator)
  const { data: planIds, isLoading: plansLoading, refetch: refetchPlans } = useCreatorPlanIds(creator)

  const posts = (postIds as bigint[] | undefined) ?? []
  const plans = (planIds as bigint[] | undefined) ?? []

  if (!isOwner) {
    return <div className="card border-red-500/40 text-red-200">Only the owner can manage content.</div>
  }

  return (
    <div className="space-y-8">
      <PostCreator onCreated={refetchPosts} />
      <PostList ids={posts} loading={postsLoading} onChanged={refetchPosts} />
      <PlanCreator onCreated={refetchPlans} />
      <PlanList ids={plans} loading={plansLoading} onChanged={refetchPlans} />
    </div>
  )
}

/* ------------------------------- Posts ------------------------------- */

function PostCreator({ onCreated }: { onCreated?: () => void }) {
  const [uri, setUri] = useState("")
  const [priceUsd, setPriceUsd] = useState("0.00")
  const [subGate, setSubGate] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)

  const { createPost } = useCreatePostOnchain()

  async function onPick(file: File) {
    if (!file) return
    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")
    if (!isImage && !isVideo) return toast.error("Pick an image or video")
    if (isImage && file.size > MAX_IMAGE_BYTES) return toast.error("Image exceeds 1 MB")
    if (isVideo && file.size > MAX_VIDEO_BYTES) return toast.error("Video exceeds 2 MB")

    try {
      setUploading(true)
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Upload failed")
      setUri(json.url as string)
      toast.success("Uploaded")
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const onCreate = async () => {
    try {
      if (!ADDR.USDC) throw new Error("Missing USDC address (NEXT_PUBLIC_USDC).")
      if (!ADDR.HUB) throw new Error("Missing HUB address (NEXT_PUBLIC_CREATOR_HUB).")
      setCreating(true)
      const priceUnits = BigInt(Math.round(parseFloat(priceUsd || "0") * 1e6)) // USDC 6dp
      // createPost(token, price, accessViaSub, uri)
      await createPost(ADDR.USDC, priceUnits, subGate, uri)
      toast.success("Post created")
      setUri("")
      setPriceUsd("0.00")
      setSubGate(false)
      onCreated?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.shortMessage || e?.message || "Create failed")
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="card space-y-4">
      <div className="text-lg font-semibold">Create a post</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button className="btn" onClick={() => document.getElementById("post-file")?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Choose file"}
            </button>
            <input
              id="post-file"
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onPick(f)
                e.currentTarget.value = ""
              }}
            />
            <span className="text-xs opacity-60">Image ≤ 1 MB · Video ≤ 2 MB</span>
          </div>
          <div className="text-xs opacity-70">
            {uri ? (isImg(uri) ? "Image selected" : isVideo(uri) ? "Video selected" : "File uploaded") : "No file selected"}
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <span className="text-sm opacity-80 w-32">Price (USDC)</span>
            <PriceInput value={priceUsd} onChange={setPriceUsd} />
            <span className="text-xs opacity-60">0 = free</span>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={subGate} onChange={(e) => setSubGate(e.target.checked)} />
            <span className="text-sm">Gated by subscription</span>
          </label>
        </div>
      </div>

      <button className="btn" onClick={onCreate} disabled={creating || !uri}>
        {creating ? "Creating…" : "Create post"}
      </button>
    </section>
  )
}

function PostRow({ id, onChanged }: { id: bigint; onChanged?: () => void }) {
  const { data: post } = usePost(id)
  const creator = post?.[0] as `0x${string}` | undefined
  const token = (post?.[1] as `0x${string}` | undefined) ?? ADDR.USDC
  const price = (post?.[2] as bigint | undefined) ?? 0n
  const active = Boolean(post?.[3] ?? true)
  const subGate = Boolean(post?.[4] ?? false)
  const uri = String(post?.[5] ?? "")

  const { update: updatePost } = useUpdatePost()

  const [editUri, setEditUri] = useState(uri)
  const [editPrice, setEditPrice] = useState(fmt6(price))
  const [editGate, setEditGate] = useState(subGate)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function pickReplace(file: File) {
    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")
    if (!isImage && !isVideo) return toast.error("Pick an image or video")
    if (isImage && file.size > MAX_IMAGE_BYTES) return toast.error("Image exceeds 1 MB")
    if (isVideo && file.size > MAX_VIDEO_BYTES) return toast.error("Video exceeds 2 MB")
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const json = await res.json()
    if (!res.ok) return toast.error(json?.error || "Upload failed")
    setEditUri(json.url as string)
    toast.success("Replaced file")
  }

  const save = async () => {
    try {
      if (!token) throw new Error("Missing token (USDC) address.")
      setSaving(true)
      const priceUnits = BigInt(Math.round(parseFloat(editPrice || "0") * 1e6))
      // updatePost(id, token, price, active, accessViaSub, uri)
      await updatePost(id, token, priceUnits, active, editGate, editUri)
      toast.success("Post updated")
      onChanged?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.shortMessage || e?.message || "Update failed")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    try {
      if (!token) throw new Error("Missing token (USDC) address.")
      setToggling(true)
      // same fields, just flip active
      await updatePost(id, token, BigInt(Math.round(parseFloat(editPrice || "0") * 1e6)), !active, editGate, editUri)
      toast.success(!active ? "Post activated" : "Post deactivated")
      onChanged?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.shortMessage || e?.message || "Toggle failed")
    } finally {
      setToggling(false)
    }
  }

  const softDelete = async () => {
    if (!confirm("Delete this post? This hides it in the app (soft delete).")) return
    try {
      setDeleting(true)
      const res = await fetch("/api/content/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "post", id: id.toString() }),
      })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Post deleted (hidden)")
      onChanged?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Post #{id.toString()}</div>
        <div className="text-sm opacity-70">{active ? "Active" : "Inactive"}</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        {isImg(editUri) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={editUri} className="h-auto w-full" alt="" />
        ) : isVideo(editUri) ? (
          <video src={editUri} className="h-auto w-full" controls playsInline preload="metadata" />
        ) : (
          <div className="bg-black/40 p-4 text-sm opacity-70">No media</div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button className="btn" onClick={() => document.getElementById(`replace-${id}`)?.click()}>
              Replace file
            </button>
            <input
              id={`replace-${id}`}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void pickReplace(f)
                e.currentTarget.value = ""
              }}
            />
            <span className="text-xs opacity-60">Image ≤ 1 MB · Video ≤ 2 MB</span>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-sm opacity-80 w-28">Price (USDC)</span>
            <PriceInput value={editPrice} onChange={setEditPrice} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={editGate} onChange={(e) => setEditGate(e.target.checked)} />
            <span className="text-sm">Gated by subscription</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 md:items-end">
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button className="btn-secondary" onClick={toggleActive} disabled={toggling}>
            {active ? "Deactivate" : "Activate"}
          </button>
          <button className="btn-danger" onClick={softDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------- Plans ------------------------------- */

function PlanCreator({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("")
  const [days, setDays] = useState(30)
  const [priceUsd, setPriceUsd] = useState("0.00")
  const [creating, setCreating] = useState(false)

  const { createPlan } = useCreatePlanOnchain()

  const onCreate = async () => {
    try {
      if (!ADDR.USDC) throw new Error("Missing USDC address (NEXT_PUBLIC_USDC).")
      setCreating(true)
      const priceUnits = BigInt(Math.round(parseFloat(priceUsd || "0") * 1e6))
      // createPlan(token, pricePerPeriod, periodDays, name, metadataURI)
      await createPlan(ADDR.USDC, priceUnits, days, name || "Plan", "")
      toast.success("Plan created")
      setName("")
      setDays(30)
      setPriceUsd("0.00")
      onCreated?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.shortMessage || e?.message || "Create failed")
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="card space-y-3">
      <h2 className="text-xl font-semibold">Create a plan</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2">
          <span className="text-sm opacity-80 w-20">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
            placeholder="Plan name"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm opacity-80 w-20">Period</span>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 30))}
            className="w-24 rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
          />
          <span className="text-sm opacity-60">days</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm opacity-80 w-20">Price</span>
          <PriceInput value={priceUsd} onChange={setPriceUsd} />
          <span className="text-sm opacity-60">USDC / period</span>
        </label>
      </div>
      <button className="btn" onClick={onCreate} disabled={creating}>
        {creating ? "Creating…" : "Create plan"}
      </button>
    </section>
  )
}

function PlanRow({ id, onChanged }: { id: bigint; onChanged?: () => void }) {
  const { data: plan } = usePlan(id)
  const token = (plan?.[1] as `0x${string}` | undefined) ?? ADDR.USDC
  const price = (plan?.[2] as bigint | undefined) ?? 0n
  const days = Number(plan?.[3] ?? 30)
  const active = Boolean(plan?.[4] ?? true)
  const name = String(plan?.[5] ?? "Plan")
  const metadataURI = String(plan?.[6] ?? "")

  const { update: updatePlan } = useUpdatePlan()

  const [toggling, setToggling] = useState(false)
  const [retiring, setRetiring] = useState(false)

  const toggleActive = async () => {
    try {
      setToggling(true)
      // updatePlan(id, name, metadataURI, pricePerPeriod, periodDays, active)
      await updatePlan(id, name, metadataURI, price, days, !active)
      toast.success(!active ? "Plan activated" : "Plan deactivated")
      onChanged?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.shortMessage || e?.message || "Toggle failed")
    } finally {
      setToggling(false)
    }
  }

  const retirePlan = async () => {
    if (!confirm("Retire this plan? New users won’t see it; current subscribers keep access.")) return
    try {
      setRetiring(true)
      // Optional: you could set active=false and add metadata tag; here we just set inactive
      await updatePlan(id, name, metadataURI, price, days, false)
      toast.success("Plan retired")
      onChanged?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Retire failed")
    } finally {
      setRetiring(false)
    }
  }

  return (
    <div className="card flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{name}</div>
        <div className="text-sm opacity-70">
          {fmt6(price)} USDC / {days}d {active ? "" : "· inactive"}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary" onClick={toggleActive} disabled={toggling}>
          {active ? "Deactivate" : "Activate"}
        </button>
        <button className="btn-danger" onClick={retirePlan} disabled={retiring}>
          {retiring ? "Retiring…" : "Retire"}
        </button>
      </div>
    </div>
  )
}

function PlanList({ ids, loading, onChanged }: { ids: bigint[]; loading?: boolean; onChanged?: () => void }) {
  if (loading) return <div className="card">Loading plans…</div>
  if (!ids || ids.length === 0) return <div className="opacity-70">No plans yet.</div>
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Your plans</h2>
      <div className="grid gap-4">
        {ids.map((id) => (
          <PlanRow key={`${id}`} id={id} onChanged={onChanged} />
        ))}
      </div>
    </section>
  )
}
