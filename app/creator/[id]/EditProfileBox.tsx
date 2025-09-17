// app/creator/[id]/EditProfileBox.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { useAccount } from "wagmi"
import {
  useGetProfile,
  useUpdateProfile,
  useChangeHandle,
  useHandleTaken,
  useCanRegister,
} from "@/hooks/useProfileRegistry"

const MAX_BIO_WORDS = 250
const MAX_BIO_CHARS = 1200
const MAX_NAME_CHARS = 48

function normalizeIpfs(u: string) {
  if (!u) return ""
  if (u.startsWith("ipfs://")) {
    const cid = u.replace("ipfs://", "")
    return `https://ipfs.io/ipfs/${cid}`
  }
  return u
}

function isHttpLike(u: string) {
  try {
    const url = new URL(u)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function clamp<T extends number>(v: T, lo: T, hi: T) {
  return Math.max(lo, Math.min(hi, v)) as T
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
  // Parse profile id
  const id = useMemo(() => {
    try {
      return BigInt(creatorId)
    } catch {
      return 0n
    }
  }, [creatorId])

  const { address } = useAccount()

  // Read profile (owner, handle, displayName, avatarURI, bio, fid, createdAt)
  const { data: prof, isLoading: loadingProf, error: profErr } = useGetProfile(id)
  const owner    = (prof?.[0] as `0x${string}` | undefined) ?? undefined
  const handle   = String(prof?.[1] ?? "")
  const name0    = String(prof?.[2] ?? "")
  const avatar0  = String(prof?.[3] ?? "")
  const bio0     = String(prof?.[4] ?? "")
  const fid0     = (prof?.[5] as bigint | undefined) ?? 0n

  const isOwner = !!address && !!owner && address.toLowerCase() === owner.toLowerCase()
  useEffect(() => {
    if (!loadingProf && prof && !isOwner) {
      toast.error("You are not the owner of this profile.")
    }
  }, [loadingProf, prof, isOwner])

  // Local editable state
  const [displayName, setDisplayName] = useState(name0)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || avatar0 || "")
  const [bio, setBio] = useState(currentBio || bio0 || "")
  const [fidStr, setFidStr] = useState(fid0 ? String(fid0) : "")
  const [saving, setSaving] = useState(false)

  // Handle change UI
  const [newHandle, setNewHandle] = useState("")
  const [wantsHandleChange, setWantsHandleChange] = useState(false)

  // Hydrate when first load arrives
  useEffect(() => {
    if (!loadingProf && prof) {
      setDisplayName((prev) => (prev ? prev : name0))
      if (!currentAvatar) setAvatarUrl(avatar0 || "")
      if (!currentBio) setBio(bio0 || "")
      setFidStr(fid0 ? String(fid0) : "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProf, prof])

  const wordCount = bio.trim().split(/\s+/).filter(Boolean).length
  const charCount = bio.length
  const nameChars = displayName.length

  const { update, isPending: updating } = useUpdateProfile()
  const { change, isPending: changingHandle } = useChangeHandle()

  // Validate / derive computed bits
  const avatarPreview = normalizeIpfs(avatarUrl)
  const fidBigint = useMemo(() => {
    if (!fidStr) return 0n
    try {
      const n = BigInt(fidStr)
      return n < 0n ? 0n : n
    } catch {
      return 0n
    }
  }, [fidStr])

  // Handle rules (mirrors typical constraints; adjust if your contract differs)
  const handleOkPattern = /^[a-z0-9_]{3,32}$/
  const canTryHandle = wantsHandleChange && newHandle.length > 0
  const handlePatternOk = !canTryHandle || handleOkPattern.test(newHandle)

  // On-demand availability checks for new handle
  const { data: taken } = useHandleTaken(canTryHandle && handlePatternOk ? newHandle : undefined)
  const { data: canReg } = useCanRegister(canTryHandle && handlePatternOk ? newHandle : undefined)
  const handleIsTaken = Boolean(taken)
  const canRegister =
    Array.isArray(canReg) ? Boolean(canReg[0]) : // (ok, reason)
    typeof canReg === "boolean" ? canReg : true

  const validate = () => {
    if (id === 0n) return "Invalid profile ID."
    if (!isOwner) return "Only the owner can edit this profile."
    if (nameChars === 0) return "Display name is required."
    if (nameChars > MAX_NAME_CHARS) return `Display name is too long (${nameChars}/${MAX_NAME_CHARS}).`
    if (bio && wordCount > MAX_BIO_WORDS) return `Bio too long (${wordCount}/${MAX_BIO_WORDS} words).`
    if (bio && charCount > MAX_BIO_CHARS) return `Bio too long (${charCount}/${MAX_BIO_CHARS} chars).`
    if (avatarUrl && !(isHttpLike(avatarPreview) || avatarUrl.startsWith("ipfs://")))
      return "Avatar must be a valid http(s) or ipfs:// URL."
    if (fidStr && fidBigint === 0n) return "FID must be a positive integer."
    if (wantsHandleChange) {
      if (!handlePatternOk) return "Handle must be 3–32 chars, lowercase a–z, 0–9, or underscore."
      if (handleIsTaken) return "That handle is already taken."
      if (!canRegister) return "That handle cannot be registered (policy check failed)."
    }
    return null
  }

  const onSave = async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    try {
      setSaving(true)
      // 1) Optional: change handle first (so the page can keep the same id)
      if (wantsHandleChange && newHandle && newHandle !== handle) {
        const h = newHandle.trim()
        await change(id, h)
        toast.success("Handle updated")
      }
      // 2) Update rest of profile
      const safeName = displayName.trim().slice(0, MAX_NAME_CHARS)
      const safeBio = bio.slice(0, MAX_BIO_CHARS)
      await update(id, safeName, avatarUrl || "", safeBio, fidBigint)
      toast.success("Profile updated")
      onSaved?.()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.shortMessage || e?.message || "Update failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-lg font-semibold">Edit profile</div>

      {/* Ownership gate */}
      {!loadingProf && !isOwner && (
        <div className="card border-red-500/40 text-red-200">
          You are not the owner of this profile.
        </div>
      )}

      {/* Display name */}
      <label className="flex flex-col gap-2">
        <span className="text-sm opacity-80">Display name</span>
        <input
          type="text"
          value={displayName}
          maxLength={MAX_NAME_CHARS}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
          placeholder="Your name as it appears"
        />
        <div className="text-xs opacity-60">
          {clamp(displayName.length, 0, MAX_NAME_CHARS)}/{MAX_NAME_CHARS}
        </div>
      </label>

      {/* Avatar */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Avatar URL (http/https or ipfs://)</span>
          <input
            type="url"
            placeholder="https://… or ipfs://CID"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
          />
        </label>

        {/* Preview */}
        <div className="flex items-end gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarPreview || "/favicon.ico"}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/favicon.ico"
            }}
          />
          <div className="text-xs opacity-70">Preview</div>
        </div>
      </div>

      {/* Bio */}
      <label className="flex flex-col gap-2">
        <span className="text-sm opacity-80">Bio</span>
        <textarea
          rows={5}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
          placeholder="Tell people about yourself…"
        />
        <div
          className={`text-xs ${
            wordCount > MAX_BIO_WORDS || charCount > MAX_BIO_CHARS ? "text-red-400" : "opacity-60"
          }`}
        >
          {wordCount}/{MAX_BIO_WORDS} words · {charCount}/{MAX_BIO_CHARS} chars
        </div>
      </label>

      {/* Farcaster FID */}
      <label className="flex flex-col gap-2">
        <span className="text-sm opacity-80">Farcaster FID (optional)</span>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="e.g., 12345"
          value={fidStr}
          onChange={(e) => setFidStr(e.target.value.replace(/[^\d]/g, ""))}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
        />
      </label>

      {/* Handle change (optional) */}
      <div className="rounded-xl border border-white/10 p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={wantsHandleChange}
            onChange={(e) => setWantsHandleChange(e.target.checked)}
          />
          <span className="text-sm">Change handle</span>
        </label>

        {wantsHandleChange && (
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
            <div className="flex flex-col gap-2">
              <span className="text-sm opacity-80">New handle</span>
              <input
                type="text"
                placeholder="lowercase, 3–32, a-z 0-9 _"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value.trim())}
                className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
              />
              <div className="text-xs">
                {!newHandle ? (
                  <span className="opacity-60">Enter a new handle to check availability.</span>
                ) : !handlePatternOk ? (
                  <span className="text-red-400">Invalid format.</span>
                ) : handleIsTaken ? (
                  <span className="text-red-400">Taken.</span>
                ) : !canRegister ? (
                  <span className="text-red-400">Not allowed by policy.</span>
                ) : (
                  <span className="text-green-400">Available.</span>
                )}
              </div>
            </div>
            <div className="text-xs opacity-60 md:text-right">
              Current: <code>@{handle}</code>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          className="btn"
          onClick={onSave}
          disabled={
            saving || updating || changingHandle || loadingProf || id === 0n || !isOwner
          }
        >
          {saving || updating || changingHandle ? "Saving…" : "Save changes"}
        </button>
        <button
          className="btn-secondary"
          onClick={() => onSaved?.()}
          disabled={saving || updating || changingHandle}
        >
          Cancel
        </button>
      </div>

      {profErr && <div className="text-sm text-red-400">Failed to read profile.</div>}
    </div>
  )
}
