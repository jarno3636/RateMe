// app/creator/page.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useChainId,
} from "wagmi"
import type { Address } from "viem" // type-only import
import { base } from "viem/chains"

import ProfileRegistry from "@/abi/ProfileRegistry.json"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"
import * as ADDR from "@/lib/addresses"
import { publicClient } from "@/lib/chain"
import { warpcastShare } from "@/lib/farcaster"

/* ---------------- constants ---------------- */
const REGISTRY = (ADDR.REGISTRY ?? ADDR.PROFILE_REGISTRY) as `0x${string}` | undefined
const MAX_AVATAR_BYTES = 1_000_000 // 1 MB
const AVATAR_FALLBACK = "/avatar.png"
const HANDLE_RE = /^[a-z0-9_.-]{1,32}$/i

/* ---------------- utils ---------------- */
const fromUnits6 = (v?: bigint): string => (Number(v ?? 0n) / 1e6).toFixed(2)

function clampStrLen(s: string, n: number) {
  return s.length > n ? s.slice(0, n) : s
}

/* ===================== Page ===================== */
export default function BecomeCreatorPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const currentChainId = useChainId()
  const onWrongNetwork = currentChainId !== undefined && currentChainId !== base.id

  // guard missing address config early (friendly UX)
  useEffect(() => {
    if (!REGISTRY) {
      toast.error("Profile registry address is not configured.")
    }
  }, [])

  /* ------------- form state ------------- */
  const [handle, setHandle] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [avatarURI, setAvatarURI] = useState("")
  const [avatarLocal, setAvatarLocal] = useState<string>("") // objectURL preview
  const [bio, setBio] = useState("")
  const [fid, setFid] = useState("")
  const [uploading, setUploading] = useState(false)

  // KV handle check state
  const [kvOk, setKvOk] = useState<boolean | null>(null)
  const [kvReason, setKvReason] = useState<string>("")

  // Memoized normalized handle + quick validation
  const normHandle = useMemo(
    () => handle.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, ""),
    [handle]
  )
  const handleLooksValid = normHandle.length > 0 && HANDLE_RE.test(normHandle)

  /* ------------- on-chain reads ------------- */

  // canRegister(handle) -> (ok, reason)
  const {
    data: canRegRaw,
    refetch: refetchCanReg,
    isFetching: checkingHandle,
  } = useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "canRegister",
    args: handleLooksValid && REGISTRY ? [normHandle] : undefined,
    query: { enabled: !!REGISTRY && !!handleLooksValid },
  })
  const canRegOk = Boolean((canRegRaw as any)?.[0])
  const canRegReason = String((canRegRaw as any)?.[1] ?? "")

  // previewCreate(user) -> [balance, allowance, fee, okBalance, okAllowance]
  const { data: preview } = useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "previewCreate",
    args: address && REGISTRY ? [address as Address] : undefined,
    query: { enabled: !!REGISTRY && !!address },
  })
  const feeUnits    = (preview as any)?.[2] as bigint | undefined
  const okBalance   = Boolean((preview as any)?.[3])
  const okAllowance = Boolean((preview as any)?.[4])

  // USDC allowance/approve (spender = registry)
  const { data: allowance } = useUSDCAllowance(REGISTRY as Address | undefined)
  const { approve, isPending: approving } = useUSDCApprove()

  // writes
  const { writeContractAsync, isPending: creating } = useWriteContract()

  const needsApproval = useMemo(() => {
    if (feeUnits === undefined) return false
    return (allowance ?? 0n) < feeUnits
  }, [allowance, feeUnits])

  const approveFee = async () => {
    try {
      if (!REGISTRY) throw new Error("Registry not configured.")
      if (!feeUnits || feeUnits <= 0n) {
        toast("No approval needed", { icon: "✅" })
        return
      }
      const t = toast.loading("Approving USDC…")
      await approve(REGISTRY, feeUnits)
      toast.dismiss(t)
      toast.success("USDC approved")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Approve failed")
    }
  }

  /* ------------- KV handle check (debounced) ------------- */
  useEffect(() => {
    let cancelled = false
    setKvOk(null)
    setKvReason("")
    if (!handleLooksValid) return

    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/check-handle?handle=${encodeURIComponent(normHandle)}`)
        const j = await r.json()
        if (!cancelled) {
          setKvOk(Boolean(j.ok))
          setKvReason(String(j.reason ?? ""))
        }
      } catch {
        if (!cancelled) {
          setKvOk(null) // unknown
          setKvReason("")
        }
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [normHandle, handleLooksValid])

  /* ------------- avatar upload ------------- */
  const previewRevokeRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewRevokeRef.current) {
        URL.revokeObjectURL(previewRevokeRef.current)
        previewRevokeRef.current = null
      }
    }
  }, [])

  const onPickAvatar: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) return toast.error("Please choose an image.")
    if (file.size > MAX_AVATAR_BYTES) return toast.error("Image must be ≤ 1MB.")

    const previewUrl = URL.createObjectURL(file)
    setAvatarLocal(previewUrl)
    previewRevokeRef.current = previewUrl

    try {
      setUploading(true)
      const fd = new FormData()
      fd.append("file", file)
      const r = await fetch("/api/upload-avatar", { method: "POST", body: fd })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.url) throw new Error(j?.error || "Upload failed")
      setAvatarURI(j.url)
      toast.success("Avatar uploaded")
    } catch (err: any) {
      toast.error(err?.message || "Upload failed")
      setAvatarLocal("")
      setAvatarURI("")
    } finally {
      setUploading(false)
    }
  }

  /* ------------- create profile ------------- */
  const onCreate = async () => {
    if (!REGISTRY) return toast.error("Registry not configured.")
    if (!isConnected || !address) return toast.error("Connect your wallet first.")
    if (onWrongNetwork) return toast.error("Please switch to Base.")
    if (!handleLooksValid) return toast.error("Enter a valid handle.")
    // Fast check (KV) then source-of-truth (chain)
    if (kvOk === false) return toast.error(kvReason || "Handle unavailable.")
    if (!canRegOk) return toast.error(canRegReason || "Handle unavailable.")
    if (feeUnits === undefined) return toast.error("Fee not available yet.")
    if (!okBalance) return toast.error("Insufficient USDC for the fee.")
    if (needsApproval) return toast.error("Please approve USDC first.")
    if (uploading) return toast.error("Please wait for avatar upload to finish.")

    const nameSafe = clampStrLen(displayName || normHandle, 48)
    const bioSafe = clampStrLen(bio, 1200)
    const fidBig = fid ? BigInt(fid) : 0n

    try {
      const t = toast.loading("Creating profile…")
      const txHash = await writeContractAsync({
        abi: ProfileRegistry as any,
        address: REGISTRY,
        functionName: "createProfile",
        args: [normHandle, nameSafe, avatarURI || "", bioSafe, fidBig],
        account: address,
        chainId: base.id,
      } as any)

      toast.loading("Waiting for confirmation…", { id: t })

      // Wait for receipt using the shared client
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      toast.dismiss(t)

      if (receipt.status !== "success") {
        toast.error("Transaction failed")
        return
      }

      toast.success("Profile created!")

      // Resolve the new profile id (best-effort)
      let newId: bigint | undefined
      try {
        newId = (await publicClient.readContract({
          abi: ProfileRegistry as any,
          address: REGISTRY,
          functionName: "getIdByHandle",
          args: [normHandle],
        })) as bigint
      } catch { /* ignore */ }

      // Background index in KV (non-blocking)
      try {
        if (newId && newId > 0n) {
          await fetch("/api/kv-index", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: newId.toString(), // BigInt -> string for JSON
              handle: normHandle,
              owner: address,
              name: nameSafe,
              avatar: avatarURI || "",
              bio: bioSafe,
            }),
          })
        }
      } catch { /* non-fatal */ }

      // Optional: quick Warpcast share intent toast — ensure url is a string
      try {
        const shareUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/creator/${newId?.toString() ?? ""}`
            : "" // ShareParams.url requires a string
        const cast = warpcastShare({
          text: `I just created my OnlyStars profile @${normHandle} — come rate & subscribe!`,
          url: shareUrl,
        })
        toast((tId) => (
          <a
            href={cast}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            onClick={() => toast.dismiss(tId.id)}
          >
            Share on Warpcast →
          </a>
        ), { duration: 6000 })
      } catch { /* ignore */ }

      if (newId && newId > 0n) router.push(`/creator/${newId.toString()}/dashboard`)
      else router.push("/discover")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Create profile failed")
    }
  }

  // On-chain handle re-check (debounced)
  useEffect(() => {
    if (!handleLooksValid) return
    const t = setTimeout(() => { void refetchCanReg() }, 300)
    return () => clearTimeout(t)
  }, [handleLooksValid, refetchCanReg])

  /* ------------- derived badges ------------- */
  const hasAvatar = Boolean(avatarURI || avatarLocal)
  const handleReady = (kvOk !== false) && canRegOk && handleLooksValid
  const paymentsReady = !!feeUnits && okBalance && okAllowance && !needsApproval
  const onBase = !onWrongNetwork // true if base or unknown

  return (
    <div className="space-y-8">
      {/* Header / explainer */}
      <section className="card space-y-2">
        <h1 className="text-2xl font-semibold">Become a creator</h1>
        <p className="opacity-80 text-sm">
          Create your on-chain creator profile on <span className="text-pink-300">Base</span>. One-time account fee:{" "}
          <span className="font-medium">{fromUnits6(feeUnits)} USDC</span>.
        </p>

        {!REGISTRY && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            Registry address missing. Ask the app admin to set <code>NEXT_PUBLIC_PROFILE_REGISTRY</code>.
          </div>
        )}

        {/* Chain hint */}
        {isConnected && onWrongNetwork && (
          <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 text-xs">
            You’re connected to the wrong network. Please switch to <span className="font-medium">Base</span>.
          </div>
        )}

        {/* Readiness badges */}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge ok={onBase} label="On Base" />
          <Badge
            ok={handleReady}
            label={
              handleLooksValid
                ? (checkingHandle ? "Checking handle…" : (handleReady ? "Handle ready" : "Handle not ready"))
                : "Enter a valid handle"
            }
          />
          <Badge ok={hasAvatar} label={hasAvatar ? "Avatar set" : "Avatar pending"} />
          <Badge ok={paymentsReady} label={paymentsReady ? "USDC ready" : "Approve/Top up USDC"} />
        </div>
      </section>

      {/* Form */}
      <section className="card space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-sm opacity-70">Handle (unique)</div>
            <div className="flex items-center gap-2">
              <span className="opacity-60">@</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourname"
                className="w-full"
                autoComplete="off"
                spellCheck={false}
                maxLength={32}
              />
            </div>
            {normHandle && (
              <div className="mt-1 text-xs">
                {/* KV quick verdict, then on-chain result */}
                {kvOk === false ? (
                  <span className="text-red-300">{kvReason || "Unavailable"}</span>
                ) : checkingHandle ? (
                  <span className="opacity-60">Checking…</span>
                ) : canRegOk ? (
                  <span className="text-green-300">Available</span>
                ) : (
                  <span className="text-red-300">{canRegReason || "Unavailable"}</span>
                )}
              </div>
            )}
            {!handleLooksValid && handle.trim() !== "" && (
              <div className="mt-1 text-xs text-amber-200/90">
                Use 1–32 characters: letters, digits, <code>.</code>, <code>-</code>, <code>_</code>.
              </div>
            )}
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-70">Display name</div>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="OnlyStars Creator"
              className="w-full"
              maxLength={48}
            />
            <div className="mt-1 text-xs opacity-60">
              Display names can duplicate; the handle is unique.
            </div>
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-70">Avatar</div>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" onChange={onPickAvatar} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarLocal || avatarURI || AVATAR_FALLBACK}
                alt=""
                className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = AVATAR_FALLBACK }}
              />
            </div>
            <div className="mt-1 text-xs opacity-60">One image, ≤ 1MB. We’ll store the URL on-chain.</div>
            {avatarURI && <div className="mt-1 text-xs break-all opacity-70">Stored URL: {avatarURI}</div>}
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-70">Farcaster FID (optional)</div>
            <input
              value={fid}
              onChange={(e) => setFid(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="e.g. 12345"
              className="w-full"
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </label>
        </div>

        <label className="block">
          <div className="mb-1 text-sm opacity-70">Bio</div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell your fans about yourself..."
            className="w-full min-h-[100px]"
            maxLength={1200}
          />
          <div className="mt-1 text-xs opacity-60">{bio.length}/1200</div>
        </label>

        {/* Fee & actions */}
        <div className="rounded-2xl border border-white/10 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="opacity-80">
              <div>
                Account creation fee:{" "}
                <span className="font-medium">{fromUnits6(feeUnits)} USDC</span>
              </div>
              <div className="text-xs opacity-70">
                Balance OK: {okBalance ? "Yes" : "No"} · Allowance OK: {okAllowance ? "Yes" : "No"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={approveFee}
                disabled={!REGISTRY || !feeUnits || feeUnits <= 0n || !needsApproval || approving}
                className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10 disabled:opacity-50"
                title={
                  !REGISTRY ? "Missing registry address"
                  : (!feeUnits || feeUnits <= 0n) ? "No approval needed"
                  : needsApproval ? "" : "Already approved"
                }
              >
                {approving ? "Approving…" : (needsApproval ? "Approve USDC" : "Approved")}
              </button>

              <button
                onClick={onCreate}
                disabled={
                  !REGISTRY ||
                  creating ||
                  uploading ||
                  !isConnected ||
                  !handleLooksValid ||
                  kvOk === false ||
                  !canRegOk ||
                  !feeUnits ||
                  !okBalance ||
                  needsApproval ||
                  onWrongNetwork
                }
                className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10 disabled:opacity-50"
              >
                {creating ? "Creating…" : (uploading ? "Uploading…" : "Create profile")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Help */}
      <section className="card text-sm opacity-80">
        <div className="mb-1 font-medium">Tips</div>
        <ul className="list-disc space-y-1 pl-5">
          <li>Handles are lowercase letters, digits, <code>.</code>, <code>-</code>, <code>_</code> (1–32 chars, unique on-chain).</li>
          <li>Display names are for presentation and can duplicate.</li>
          <li>Avatar: single image ≤ 1MB; URL saved on-chain.</li>
          <li>Creation fee is paid in USDC; you may need to approve spending once.</li>
        </ul>
      </section>
    </div>
  )
}

/* ---------- Tiny badge component ---------- */
function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-3 py-1",
        ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-white/15 bg-white/5 opacity-80",
        "shadow-[0_0_12px_rgba(16,185,129,0.15)]",
        "text-[11px] tracking-wide",
      ].join(" ")}
      title={label}
    >
      <span
        aria-hidden
        className={[
          "inline-block h-1.5 w-1.5 rounded-full",
          ok ? "bg-emerald-400" : "bg-white/40",
        ].join(" ")}
      />
      {label}
    </span>
  )
}
