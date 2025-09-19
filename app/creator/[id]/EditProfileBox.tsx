// app/creator/[id]/EditProfileBox.tsx
"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import toast from "react-hot-toast"
import { useAccount } from "wagmi"
import { useGetProfile, useUpdateProfile } from "@/hooks/useProfileRegistry"
import { creatorShareLinks } from "@/lib/farcaster"

const MAX_BIO_WORDS = 250
const MAX_BIO_CHARS = 1200
const MAX_NAME_CHARS = 48
const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // 1 MB
const FALLBACK_AVATAR = "/avatar.png"

type ProfileTuple = [
  `0x${string}`, // owner
  string,        // handle
  string,        // display name
  string,        // avatar URI
  string,        // bio
  bigint,        // fid
]

function isProfileTuple(v: unknown): v is ProfileTuple {
  return Array.isArray(v) && typeof v[0] === "string"
}

function normalizeIpfs(u: string) {
  if (!u) return ""
  return u.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7)}` : u
}
function isHttpLike(u: string) {
  try {
    const url = new URL(u)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export default function EditProfileBox({
  creatorId,
  currentAvatar,
  currentBio,
  onSaved,
}: {
  creatorId: string
  currentAvatar?: string | null
  currentBio?: string | null
  onSaved?: () => void
}) {
  // ---------- load + ownership ----------
  const id = useMemo(() => {
    try { return BigInt(creatorId) } catch { return 0n }
  }, [creatorId])

  const { address } = useAccount()
  const { data: prof, isLoading: loadingProf } = useGetProfile(id)
  const p = isProfileTuple(prof) ? prof : null

  const owner   = (p?.[0] as `0x${string}` | undefined) ?? undefined
  const handle  = String(p?.[1] ?? "")
  const name0   = String(p?.[2] ?? "")
  const avatar0 = String(p?.[3] ?? "")
  const bio0    = String(p?.[4] ?? "")
  const fid0    = (p?.[5] as bigint | undefined) ?? 0n

  const isOwner = !!address && !!owner && address.toLowerCase() === owner.toLowerCase()

  // ---------- authoritative on-chain snapshot (for reset/dirtiness) ----------
  const chainSnapRef = useRef({
    name: name0,
    avatar: avatar0 || FALLBACK_AVATAR,
    bio: bio0,
    fid: fid0 ? String(fid0) : "",
  })

  useEffect(() => {
    if (!loadingProf && p) {
      chainSnapRef.current = {
        name: name0,
        avatar: avatar0 || FALLBACK_AVATAR,
        bio: bio0,
        fid: fid0 ? String(fid0) : "",
      }
    }
  }, [loadingProf, p, name0, avatar0, bio0, fid0])

  // ---------- local editable state ----------
  const [displayName, setDisplayName] = useState(chainSnapRef.current.name)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || chainSnapRef.current.avatar)
  const [bio, setBio] = useState(currentBio || chainSnapRef.current.bio)
  const [fidStr, setFidStr] = useState(chainSnapRef.current.fid)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // hydrate when profile finishes loading
  useEffect(() => {
    if (!loadingProf && p) {
      setDisplayName(chainSnapRef.current.name)
      if (!currentAvatar) setAvatarUrl(chainSnapRef.current.avatar)
      if (!currentBio) setBio(chainSnapRef.current.bio)
      setFidStr(chainSnapRef.current.fid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProf, p])

  const wordCount = bio.trim().split(/\s+/).filter(Boolean).length
  const charCount = bio.length
  const nameChars = displayName.length

  const { update, isPending: updating } = useUpdateProfile()
  const avatarPreview = normalizeIpfs(avatarUrl)

  const fidBigint = useMemo(() => {
    if (!fidStr) return 0n
    try { const n = BigInt(fidStr); return n < 0n ? 0n : n } catch { return 0n }
  }, [fidStr])

  // ---------- validation ----------
  const validate = () => {
    if (id === 0n) return "Invalid profile ID."
    if (!isOwner) return "Only the owner can edit this profile."
    if (!displayName.trim()) return "Display name is required."
    if (nameChars > MAX_NAME_CHARS) return `Display name too long (${nameChars}/${MAX_NAME_CHARS}).`
    if (bio && wordCount > MAX_BIO_WORDS) return `Bio too long (${wordCount}/${MAX_BIO_WORDS} words).`
    if (bio && charCount > MAX_BIO_CHARS) return `Bio too long (${charCount}/${MAX_BIO_CHARS} chars).`
    if (avatarUrl && !(isHttpLike(avatarPreview) || avatarUrl.startsWith("ipfs://")))
      return "Avatar must be a valid http(s) or ipfs:// URL."
    if (fidStr && fidBigint === 0n) return "FID must be a positive integer."
    return null
  }

  const isDirty =
    displayName.trim() !== chainSnapRef.current.name ||
    (avatarUrl || FALLBACK_AVATAR) !== (chainSnapRef.current.avatar || FALLBACK_AVATAR) ||
    bio !== chainSnapRef.current.bio ||
    (fidStr || "") !== (chainSnapRef.current.fid || "")

  // ---------- avatar upload ----------
  const handleAvatarPick = useCallback(async (file: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) return toast.error("Please pick an image file")
    if (file.size > MAX_IMAGE_BYTES) return toast.error("Image exceeds 1 MB")
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Upload failed")
      setAvatarUrl(String(json.url))
      toast.success("Avatar uploaded")
    } catch (e: any) {
      toast.error(e?.message || "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [])

  // ---------- actions ----------
  const onSave = async () => {
    const err = validate()
    if (err) return toast.error(err)
    try {
      setSaving(true)
      const safeName = displayName.trim().slice(0, MAX_NAME_CHARS)
      const safeBio = bio.slice(0, MAX_BIO_CHARS)
      await update(id, safeName, avatarUrl || FALLBACK_AVATAR, safeBio, fidBigint)
      chainSnapRef.current = {
        name: safeName,
        avatar: avatarUrl || FALLBACK_AVATAR,
        bio: safeBio,
        fid: fidStr || "",
      }
      toast.success("Profile updated")
      onSaved?.()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Update failed")
    } finally {
      setSaving(false)
    }
  }

  const onCancelReset = () => {
    const snap = chainSnapRef.current
    setDisplayName(snap.name)
    setAvatarUrl(snap.avatar || FALLBACK_AVATAR)
    setBio(snap.bio)
    setFidStr(snap.fid)
    toast("Changes discarded", { icon: "↩️" })
  }

  // Farcaster quick-link (premium touch): if FID present, show Warpcast profile shortcut
  const fidNum = fidBigint ? Number(fidBigint) : 0
  const fcLink =
    fidNum > 0
      ? `https://warpcast.com/~/profile/${fidNum}`
      : undefined

  const { url: publicUrl } = creatorShareLinks(handle || creatorId, `Check out @${handle || "creator"} on OnlyStars`)

  const disabledAll = !isOwner || loadingProf

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-semibold">Edit profile</div>
        <div className="flex items-center gap-2 text-xs">
          <span className="badge">On-chain & non-custodial</span>
          {handle && <a className="badge badge-primary" href={publicUrl} target="_blank" rel="noopener noreferrer">Public page</a>}
          {fcLink && (
            <a className="badge border-sky-400/40 bg-sky-400/10 text-sky-100" href={fcLink} target="_blank" rel="noopener noreferrer">
              Warpcast
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto,1fr]">
        {/* Avatar block */}
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarPreview || FALLBACK_AVATAR}
            alt=""
            width={104}
            height={104}
            className="h-26 w-26 rounded-full object-cover ring-1 ring-white/10 avatar-backdrop"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_AVATAR }}
          />
          <div className="flex gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabledAll || uploading}
            >
              {uploading ? "Uploading…" : "Change avatar"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setAvatarUrl(FALLBACK_AVATAR)}
              disabled={disabledAll}
              title="Use default"
            >
              Reset
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.currentTarget.files?.[0]
              if (f) void handleAvatarPick(f)
            }}
          />
          <div className="text-[11px] opacity-70">PNG/JPG ≤ 1MB</div>
        </div>

        {/* Form block */}
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-sm opacity-70">Display name</div>
            <input
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
              value={displayName}
              onChange={(e)=>setDisplayName(e.target.value)}
              maxLength={MAX_NAME_CHARS}
              disabled={disabledAll}
            />
            <div className="mt-1 text-right text-[11px] opacity-60">
              {nameChars}/{MAX_NAME_CHARS}
            </div>
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-70">Avatar URL (http(s) or ipfs://)</div>
            <input
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
              value={avatarUrl}
              onChange={(e)=>setAvatarUrl(e.target.value)}
              placeholder="https://... or ipfs://..."
              disabled={disabledAll}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-70">Bio</div>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
              value={bio}
              onChange={(e)=>setBio(e.target.value)}
              maxLength={MAX_BIO_CHARS}
              disabled={disabledAll}
            />
            <div className="mt-1 flex items-center justify-between text-[11px] opacity-60">
              <span>{wordCount}/{MAX_BIO_WORDS} words</span>
              <span>{charCount}/{MAX_BIO_CHARS} chars</span>
            </div>
          </label>

          <label className="block max-w-xs">
            <div className="mb-1 text-sm opacity-70">Farcaster FID (optional)</div>
            <input
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
              value={fidStr}
              onChange={(e)=>setFidStr(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              pattern="\d*"
              placeholder="e.g. 12345"
              disabled={disabledAll}
            />
          </label>

          {/* Actions */}
          <div className="actions-row pt-1">
            <button
              onClick={onSave}
              disabled={disabledAll || saving || updating || !isDirty}
              className="btn btn-primary disabled:opacity-50"
              title={!isDirty ? "No changes" : ""}
            >
              {saving || updating ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={onCancelReset}
              disabled={disabledAll || (!isDirty && !avatarUrl)}
              className="btn btn-secondary disabled:opacity-50"
            >
              Discard
            </button>
            {/* subtle helper chips */}
            <div className="ml-auto flex items-center gap-2 text-[11px] opacity-70">
              <span className="pill">Owner: {owner ? `${owner.slice(0,6)}…${owner.slice(-4)}` : "—"}</span>
              <span className="pill">@{handle || "unknown"}</span>
            </div>
          </div>

          {!isOwner && !loadingProf && (
            <div className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-100">
              You are viewing as a non-owner; editing is disabled.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
