// /components/CreateProfileCTA.tsx
"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { formatUnits, parseUnits } from "viem"

import { usePreviewCreate, useCreateProfile } from "@/hooks/useProfileRegistry"
import { useApproveUsdc, useUsdcAllowance } from "@/hooks/useUsdcApproval"

export default function CreateProfileCTA({
  handle,
  displayName,
  avatarURI,
  bio,
  fid,
}: {
  handle: string
  displayName: string
  avatarURI: string
  bio: string
  fid: bigint
}) {
  const { address } = useAccount()
  const { data: preview } = usePreviewCreate()
  const { data: allowance } = useUsdcAllowance()
  const { approve, isPending: approving } = useApproveUsdc()
  const { create, isPending: creating } = useCreateProfile()
  const [err, setErr] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const fee = preview?.[2] as bigint | undefined
  const okBalance = !!preview?.[3]
  const okAllowance = !!preview?.[4]

  const onApprove = async () => {
    setErr(null)
    try {
      // approve exact fee or max; fee is 6 decimals for USDC
      const amt = typeof fee === "bigint" && fee > 0n ? fee : undefined
      const h = await approve(amt)
      setOkMsg(`Approved USDC: ${h}`)
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  const onCreate = async () => {
    setErr(null)
    setOkMsg(null)
    try {
      const h = await create(handle.trim(), displayName.trim(), avatarURI.trim(), bio.trim(), fid)
      setOkMsg(`Profile created: ${h}`)
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  if (!address) {
    return <button className="btn btn-primary" disabled>Connect wallet to continue</button>
  }

  if (!okBalance) {
    const need = typeof fee === "bigint" ? Number(formatUnits(fee, 6)).toFixed(2) : "?"
    return (
      <div className="space-y-2">
        <div className="text-sm text-red-500">Insufficient USDC balance.</div>
        <div className="text-xs opacity-70">Required fee: ~{need} USDC</div>
        <a href="https://bridge.base.org/" target="_blank" rel="noreferrer" className="btn btn-secondary">Bridge to Base</a>
        <a href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=USDC&chain=base" target="_blank" rel="noreferrer" className="btn btn-ghost">Swap for USDC</a>
      </div>
    )
  }

  if (!okAllowance) {
    return (
      <div className="space-y-2">
        <button onClick={onApprove} className="btn btn-primary" disabled={approving}>
          {approving ? "Approving…" : "Approve USDC"}
        </button>
        {err && <div className="text-xs text-red-500">{err}</div>}
        {okMsg && <div className="text-xs text-green-500">{okMsg}</div>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button onClick={onCreate} className="btn btn-success" disabled={creating}>
        {creating ? "Creating…" : "Create Profile"}
      </button>
      {err && <div className="text-xs text-red-500">{err}</div>}
      {okMsg && <div className="text-xs text-green-500">{okMsg}</div>}
    </div>
  )
}
