// /app/creator/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { useAccount, useReadContract, useWriteContract, useChainId } from "wagmi"
import { Address } from "viem"
import { base } from "viem/chains"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import { publicClient } from "@/lib/chain"
import { useUSDCAllowance, useUSDCApprove } from "@/hooks/useUsdc"

const REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`
const MAX_AVATAR_BYTES = 1_000_000 // 1MB

const fromUnits6 = (v?: bigint) => (Number(v ?? 0n) / 1e6).toFixed(2)

export default function BecomeCreatorPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const currentChainId = useChainId()

  // form state
  const [handle, setHandle] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [avatarURI, setAvatarURI] = useState("")        // final stored URL (ipfs/http)
  const [avatarLocal, setAvatarLocal] = useState<string>("") // local preview (object URL)
  const [bio, setBio] = useState("")
  const [fid, setFid] = useState("")
  const [uploading, setUploading] = useState(false)

  // normalize handle (on-chain uniqueness = handle)
  const normHandle = useMemo(
    () => handle.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, ""),
    [handle]
  )

  /* ---------- READS ---------- */

  // canRegister(handle) -> (ok, reason)  — this enforces uniqueness on-chain
  const { data: canRegRaw, refetch: refetchCanReg, isFetching: checkingHandle } = useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "canRegister",
    args: normHandle ? [normHandle] : undefined,
    query: { enabled: !!normHandle },
  })
  const canRegOk = Boolean((canRegRaw as any)?.[0])
  const canRegReason = String((canRegRaw as any)?.[1] ?? "")

  // previewCreate(user) -> [balance, allowance, fee, okBalance, okAllowance]
  const { data: preview } = useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "previewCreate",
    args: address ? [address as Address] : undefined,
    query: { enabled: !!address },
  })
  const feeUnits    = (preview as any)?.[2] as bigint | undefined
  const okBalance   = Boolean((preview as any)?.[3])
  const okAllowance = Boolean((preview as any)?.[4])

  // USDC allowance/approve (spender = registry)
  const { data: allowance } = useUSDCAllowance(REGISTRY)
  const { approve, isPending: approving } = useUSDCApprove()

  /* ---------- WRITE: createProfile ---------- */
  const { writeContractAsync, isPending: creating } = useWriteContract()

  const needsApproval = useMemo(() => {
    if (feeUnits === undefined) return false
    return (allowance ?? 0n) < feeUnits
  }, [allowance, feeUnits])

  const approveFee = async () => {
    try {
      if (!feeUnits || feeUnits <= 0n) return toast.error("No fee required or fee unavailable.")
      const t = toast.loading("Approving USDC…")
      await approve(REGISTRY, feeUnits)
      toast.dismiss(t); toast.success("USDC approved")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Approve failed")
    }
  }

  // ---------- Avatar upload (client -> /api/upload-avatar -> Blob) ----------
  const onPickAvatar: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // enforce: single image file, ≤ 1MB
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image.")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be ≤ 1MB.")
      return
    }

    // show local preview
    const previewUrl = URL.createObjectURL(file)
    setAvatarLocal(previewUrl)

    try {
      setUploading(true)
      const fd = new FormData()
      fd.append("file", file)
      const r = await fetch("/api/upload-avatar", {
        method: "POST",
        body: fd,
      })
      if (!r.ok) throw new Error(await r.text())
      const j = await r.json() as { url?: string }
      if (!j.url) throw new Error("No URL returned")
      setAvatarURI(j.url)      // final URL to store on-chain
      toast.success("Avatar uploaded")
    } catch (err: any) {
      toast.error(err?.message || "Upload failed")
      // clean preview on failure
      setAvatarLocal("")
      setAvatarURI("")
    } finally {
      setUploading(false)
    }
  }

  const createProfile = async () => {
    if (!isConnected || !address) return toast.error("Connect your wallet first.")
    if (!normHandle) return toast.error("Enter a handle.")
    if (!canRegOk) return toast.error(canRegReason || "Handle unavailable.")
    if (feeUnits === undefined) return toast.error("Fee not available yet.")
    if (!okBalance) return toast.error("Insufficient USDC for the fee.")
    if (needsApproval) return toast.error("Please approve USDC first.")
    if (uploading) return toast.error("Please wait for avatar upload to finish.")

    try {
      const fidBig = fid ? BigInt(fid) : 0n
      const t = toast.loading("Creating profile…")

      await writeContractAsync({
        abi: ProfileRegistry as any,
        address: REGISTRY,
        functionName: "createProfile",
        args: [normHandle, displayName || normHandle, avatarURI || "", bio || "", fidBig],
        account: address,
        chainId: currentChainId || base.id,
      } as any)

      toast.loading("Waiting for confirmation…", { id: t })
      toast.dismiss(t)
      toast.success("Profile created!")

      // Resolve and route
      let newId: bigint | undefined
      try {
        newId = (await publicClient.readContract({
          abi: ProfileRegistry as any,
          address: REGISTRY,
          functionName: "getIdByHandle",
          args: [normHandle],
        })) as bigint
      } catch { /* ignore */ }

      if (newId && newId > 0n) router.push(`/creator/${newId.toString()}/dashboard`)
      else router.push("/discover")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Create profile failed")
    }
  }

  // re-check when user edits handle (debounce)
  useEffect(() => {
    const t = setTimeout(() => { if (normHandle) refetchCanReg() }, 300)
    return () => clearTimeout(t)
  }, [normHandle, refetchCanReg])

  /* ---------- UI ---------- */
  return (
    <div className="space-y-8">
      {/* Header / explainer */}
      <section className="card space-y-2">
        <h1 className="text-2xl font-semibold">Become a creator</h1>
        <p className="opacity-80 text-sm">
          Create your on-chain creator profile on <span className="text-pink-300">Base</span>.
          One-time account fee: <span className="font-medium">{fromUnits6(feeUnits)} USDC</span>.
        </p>
        <div className="flex flex-wrap gap-2 text-xs opacity-70">
          <span className="rounded-full border border-white/10 px-3 py-1">Instant, secure USDC</span>
          <span className="rounded-full border border-white/10 px-3 py-1">1% platform fee</span>
          <span className="rounded-full border border-white/10 px-3 py-1">Micropayments for ratings</span>
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
              />
            </div>
            {normHandle && (
              <div className="mt-1 text-xs">
                {checkingHandle ? (
                  <span className="opacity-60">Checking…</span>
                ) : canRegOk ? (
                  <span className="text-green-300">Available</span>
                ) : (
                  <span className="text-red-300">{canRegReason || "Unavailable"}</span>
                )}
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
            />
            <div className="mt-1 text-xs opacity-60">Display names can duplicate; the handle is unique.</div>
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-70">Avatar</div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={onPickAvatar}
              />
              {avatarLocal && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarLocal} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
              )}
            </div>
            <div className="mt-1 text-xs opacity-60">One image, ≤ 1MB. We’ll store the URL on-chain.</div>
            {avatarURI && (
              <div className="mt-1 text-xs break-all opacity-70">Stored URL: {avatarURI}</div>
            )}
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-70">Farcaster FID (optional)</div>
            <input
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              placeholder="e.g. 12345"
              className="w-full"
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
          />
        </label>

        {/* Fee & actions */}
        <div className="rounded-2xl border border-white/10 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="opacity-80">
              <div>Account creation fee: <span className="font-medium">{fromUnits6(feeUnits)} USDC</span></div>
              <div className="text-xs opacity-70">
                Balance OK: {okBalance ? "Yes" : "No"} · Allowance OK: {okAllowance ? "Yes" : "No"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={approveFee}
                disabled={!feeUnits || feeUnits <= 0n || !needsApproval || approving}
                className="rounded-full border border-pink-500/50 px-4 py-2 text-sm hover:bg-pink-500/10 disabled:opacity-50"
              >
                {approving ? "Approving…" : (needsApproval ? "Approve USDC" : "Approved")}
              </button>

              <button
                onClick={createProfile}
                disabled={
                  creating ||
                  uploading ||
                  !isConnected ||
                  !normHandle ||
                  !canRegOk ||
                  !feeUnits ||
                  !okBalance ||
                  needsApproval
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
          <li>Handles are lowercase letters, digits, <code>.</code>, <code>-</code>, <code>_</code> (unique on-chain).</li>
          <li>Display names are for presentation and can duplicate.</li>
          <li>Avatar: single image ≤ 1MB; URL saved on-chain.</li>
          <li>Creation fee is paid in USDC; you may need to approve spending once.</li>
        </ul>
      </section>
    </div>
  )
}
