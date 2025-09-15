"use client"

import { useState, useMemo } from "react"
import { useAccount } from "wagmi"
import toast from "react-hot-toast"
import { useAverage, useMyRating, useRate, useUpdateRating } from "@/hooks/useRatings"
import { useRatingsAllowance } from "@/hooks/useRatingsAllowance"

export default function RatingWidget({ creator }: { creator: `0x${string}` }) {
  const { address } = useAccount()
  const { data: avgX100 } = useAverage(creator)
  const { data: my } = useMyRating(creator)

  const myScore = Number((my as any)?.[0] ?? 0)
  const myComment = String((my as any)?.[3] ?? "")

  const [score, setScore] = useState(myScore || 5)
  const [comment, setComment] = useState(myComment)
  const hasExisting = useMemo(() => (myScore ?? 0) > 0, [myScore])

  const { fee, hasAllowance, approveForFee, states } = useRatingsAllowance()
  const { rate, wait: waitRate } = useRate()
  const { update, wait: waitUpdate } = useUpdateRating()

  const submit = async () => {
    if (!address) return toast.error("Connect a wallet first.")
    try {
      if (!hasAllowance) {
        const t = toast.loading("Approving USDC for rating fee…")
        await approveForFee()
        toast.dismiss(t); toast.success("Approval confirmed")
      }
      const doing = toast.loading(hasExisting ? "Updating rating…" : "Submitting rating…")
      if (hasExisting) {
        const tx = await update(creator, score, comment || myComment)
        await waitUpdate.wait
      } else {
        const tx = await rate(creator, score, comment)
        await waitRate.wait
      }
      toast.dismiss(doing); toast.success("Rating saved")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to rate")
    }
  }

  return (
    <div className="card space-y-3">
      <div className="font-medium">Rate this creator</div>
      <div className="text-sm opacity-70">Fee: {(Number(fee) / 1e6).toFixed(2)} USDC</div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number" min={1} max={5}
          value={score} onChange={(e)=>setScore(Math.max(1, Math.min(5, Number(e.target.value))))}
          className="w-24"
        />
        <input
          placeholder="Comment (optional)"
          value={comment} onChange={(e)=>setComment(e.target.value)}
          className="flex-1"
        />
        <button className="btn" onClick={submit} disabled={states.loading || states.approving}>
          {hasExisting ? "Update rating" : "Submit rating"}
        </button>
      </div>

      <div className="opacity-70 text-sm">
        Average: {avgX100 ? (Number(avgX100) / 100).toFixed(2) : "-"}
      </div>
    </div>
  )
}
