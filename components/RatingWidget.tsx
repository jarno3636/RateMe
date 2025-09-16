// /components/RatingWidget.tsx
"use client"

import { useState, useMemo } from "react"
import { useAccount } from "wagmi"
import toast from "react-hot-toast"
import {
  useAverage,
  useMyRating,
  useRate,
  useUpdateRating,
} from "@/hooks/useRatings"
import { useRatingsAllowance } from "@/hooks/useRatingsAllowance"

type ParsedMyRating = { score: number; comment: string }

/** Safely parse the result from Ratings.getRating(...) across ABI variations. */
function parseMyRating(raw: unknown): ParsedMyRating {
  // Known/common layouts:
  // A) [score(uint256/uint8), comment(string)] or [score, comment, updatedAt]
  // B) [rater(address), ratee(address), score(uint256/uint8), comment(string), updatedAt]
  // C) undefined or 0-like if not rated
  if (!Array.isArray(raw)) return { score: 0, comment: "" }

  const arr = raw as any[]
  // If first element looks like an address, score likely at index 2, comment at index 3
  if (typeof arr[0] === "string" && arr[0]?.startsWith?.("0x")) {
    const score = Number(arr[2] ?? 0)
    const comment = String(arr[3] ?? "")
    return { score: Number.isFinite(score) ? score : 0, comment }
  }

  // Otherwise assume score is first and comment next
  const score = Number(arr[0] ?? 0)
  const comment = String(arr[1] ?? arr[3] ?? "")
  return { score: Number.isFinite(score) ? score : 0, comment }
}

export default function RatingWidget({ creator }: { creator: `0x${string}` }) {
  const { address } = useAccount()

  // Reads
  const { data: avgX100 } = useAverage(creator)
  const { data: myRaw } = useMyRating(creator)

  const { score: myScore, comment: myComment } = parseMyRating(myRaw)

  // Local state
  const [score, setScore] = useState(() => (myScore || 5))
  const [comment, setComment] = useState(myComment)
  const hasExisting = useMemo(() => (myScore ?? 0) > 0, [myScore])

  // Fees / approvals (USDC fee for rating)
  const { fee, hasAllowance, approveForFee, states } = useRatingsAllowance()

  // Writes
  const { rate } = useRate()
  const { update } = useUpdateRating()

  const onSubmit = async () => {
    if (!address) return toast.error("Connect a wallet first.")

    const clamped = Math.max(1, Math.min(5, Number(score) || 5))

    try {
      // If a fee exists and allowance is insufficient, approve once.
      if ((fee ?? 0n) > 0n && !hasAllowance) {
        const t = toast.loading("Approving USDC for rating fee…")
        await approveForFee?.()
        toast.dismiss(t)
        toast.success("Approval confirmed")
      }

      const doing = toast.loading(hasExisting ? "Updating rating…" : "Submitting rating…")
      if (hasExisting) {
        // Preserve previous comment if user cleared the input (UX nicety).
        await update(creator, clamped, comment || myComment)
      } else {
        await rate(creator, clamped, comment)
      }
      toast.dismiss(doing)
      toast.success("Rating saved")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to rate")
    }
  }

  const avg = avgX100 ? (Number(avgX100) / 100).toFixed(2) : "-"

  return (
    <div className="card space-y-3">
      <div className="font-medium">Rate this creator</div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-sm opacity-70">Score</span>
          <input
            type="number"
            min={1}
            max={5}
            value={score}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (!Number.isFinite(v)) return
              setScore(Math.max(1, Math.min(5, Math.floor(v))))
            }}
            className="w-24"
          />
        </label>

        <input
          placeholder="Comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="flex-1 min-w-[200px]"
        />

        <button
          className="btn"
          onClick={onSubmit}
          disabled={states.loading || states.approving}
          title={states.loading ? "Loading fee…" : states.approving ? "Approving…" : ""}
        >
          {hasExisting ? "Update rating" : "Submit rating"}
        </button>
      </div>

      <div className="grid gap-2 sm:flex sm:items-center sm:gap-6 text-sm">
        <div className="opacity-70">
          Average: <span className="font-medium">{avg}</span>
        </div>
        <div className="opacity-70">
          Fee:{" "}
          <span className="font-medium">
            {fee !== undefined ? (Number(fee) / 1e6).toFixed(2) : "--"} USDC
          </span>
        </div>
      </div>
    </div>
  )
}
