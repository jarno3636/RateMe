// app/creator/[id]/EditProfileBox.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useAccount } from "wagmi"
import { useGetProfile, useUpdateProfile } from "@/hooks/useProfileRegistry"

const MAX_BIO_WORDS = 250
const MAX_BIO_CHARS = 1200
const MAX_NAME_CHARS = 48
const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // 1 MB

function normalizeIpfs(u: string) {
  if (!u) return ""
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice(7)}`
  return u
}
function isHttpLike(u: string) {
  try { const url = new URL(u); return url.protocol === "http:" || url.protocol === "https:" } catch { return false }
}
function clamp<T extends number>(v: T, lo: T, hi: T) { return Math.max(lo, Math.min(hi, v)) as T }

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
  const id = useMemo(() => { try { return BigInt(creatorId) } catch { return 0n } }, [creatorId])

  const { address } = useAccount()

  // Read profile (owner, handle, displayName, avatarURI, bio, fid, createdAt)
  const { data: prof, isLoading: loadingProf, error: profErr } = useGetProfile(id)
  const owner   = (prof?.[0] as `0x${string}` | undefined) ?? undefined
  const name0   = String(prof?.[2] ?? "")
  const avatar0 = String(prof?.[3] ?? "")
  const bio0    = String(prof?.[4] ?? "")
  const fid0    = (prof?.[5] as bigint | undefined) ?? 0n

  const isOwner = !!address && !!owner && address.toLowerCase() === owner.toLowerCase()
  useEffect(() => {
    if (!loadingProf && prof && !isOwner) toast.error("You are not the owner of this profile.")
  }, [loadingProf, prof, isOwner])

  // Local editable state
  const [displayName, setDisplayName] = useState(name0)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || avatar0 || "/avatar.png")
  const [bio, setBio] = useState(currentBio || bio0 || "")
  const [fidStr, setFidStr] = useState(fid0 ? String(fid0) : "")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Hydrate when first load arrives
  useEffect(() => {
    if (!loadingProf && prof) {
      setDisplayName((prev) => (prev ? prev : name0))
      if (!currentAvatar) setAvatarUrl(avatar0 || "/avatar.png")
      if (!currentBio) setBio(bio0 || "")
      setFidStr(fid0 ? String(fid0) : "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProf, prof])

  const wordCount = bio.trim().split(/\s+/).filter(Boolean).length
  const charCount = bio.length
  const nameChars = displayName.length

  const { update, isPending: updating } = useUpdateProfile()

  const avatarPreview = normalizeIpfs(avatarUrl)
  const fidBigint = useMemo(() => {
    if (!fidStr) return 0n
    try { const n = BigInt(fidStr); return n < 0n ? 0n : n } catch { return 0n }
  }, [fidStr])

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
    return null
  }

  async function handleAvatarPick(file: File) {
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
      setAvatarUrl(json.url as string)
      toast.success("Avatar uploaded")
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const onSave = async () => {
    const err = validate()
    if (err) return toast.error(err)
    try {
      setSaving(true)
      const safeName = displayName.trim().slice(0, MAX_NAME_CHARS)
      const safeBio = bio.slice(0, MAX_BIO_CHARS)
      await update(id, safeName, avatarUrl || "/avatar.png", safeBio, fidBigint)
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

      {/* Avatar picker + preview (no raw URL shown in UI except optional field) */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Avatar</span>
          <div className="flex items-center gap-3">
            <button
              className="btn"
              onClick={() => document.getElementById("avatar-file")?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Choose image"}
            </button>
            <input
              id="avatar-file"
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleAvatarPick(f)
                e.currentTarget.value = ""
              }}
            />
            <span className="text-xs opacity-60">Max 1 MB</span>
          </div>

          {/* Optional: allow pasting a URL manually */}
          <input
            type="url"
            placeholder="…or paste an https:// or ipfs:// URL"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
          />
        </div>

        {/* Preview */}
        <div className="flex items-end gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalizeIpfs(avatarUrl) || "/avatar.png"}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/avatar.png" }}
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
        <div className={`text-xs ${wordCount > MAX_BIO_WORDS || charCount > MAX_BIO_CHARS ? "text-red-400" : "opacity-60"}`}>
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

      <div className="flex gap-2">
        <button
          className="btn"
          onClick={onSave}
          disabled={saving || updating || loadingProf || id === 0n || !isOwner}
        >
          {saving || updating ? "Saving…" : "Save changes"}
        </button>
        <button className="btn-secondary" onClick={() => onSaved?.()} disabled={saving || updating}>
          Cancel
        </button>
      </div>

      {profErr && <div className="text-sm text-red-400">Failed to read profile.</div>}
    </div>
  )
}
