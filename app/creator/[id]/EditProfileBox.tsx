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
const FALLBACK_AVATAR = "/avatar.png"

type ProfileTuple = [
  `0x${string}`, // owner
  string,        // handle
  string,        // display name
  string,        // avatar URI
  string,        // bio
  bigint,        // fid
  // ...add more indexes if your hook returns more fields
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
  const id = useMemo(() => {
    try { return BigInt(creatorId) } catch { return 0n }
  }, [creatorId])

  const { address } = useAccount()
  const { data: prof, isLoading: loadingProf, error: profErr } = useGetProfile(id)

  // ✅ Narrow the untyped data to a tuple (or null)
  const p = isProfileTuple(prof) ? prof : null

  // Safely index after narrowing
  const owner   = (p?.[0] as `0x${string}` | undefined) ?? undefined
  const name0   = String(p?.[2] ?? "")
  const avatar0 = String(p?.[3] ?? "")
  const bio0    = String(p?.[4] ?? "")
  const fid0    = (p?.[5] as bigint | undefined) ?? 0n

  const isOwner = !!address && !!owner && address.toLowerCase() === owner.toLowerCase()

  useEffect(() => {
    if (!loadingProf && p && !isOwner) {
      toast.error("You are not the owner of this profile.")
    }
  }, [loadingProf, p, isOwner])

  // Keep a stable snapshot of the last on-chain values for precise resets.
  const chainSnapRef = useRef({
    name: name0,
    avatar: avatar0 || FALLBACK_AVATAR,
    bio: bio0,
    fid: fid0 ? String(fid0) : "",
  })

  // When fresh profile data arrives, update the snapshot.
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

  // Local editable state
  const [displayName, setDisplayName] = useState(chainSnapRef.current.name)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || chainSnapRef.current.avatar)
  const [bio, setBio] = useState(currentBio || chainSnapRef.current.bio)
  const [fidStr, setFidStr] = useState(chainSnapRef.current.fid)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Hydrate UI fields when profile finishes loading
  useEffect(() => {
    if (!loadingProf && p) {
      setDisplayName((prev) => prev || chainSnapRef.current.name)
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

  return (
    /* …the rest of your JSX stays the same… */
    <div className="space-y-6"> {/* unchanged content below */} </div>
  )
}
