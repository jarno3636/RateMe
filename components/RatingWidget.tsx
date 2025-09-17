// /components/RatingWidget.tsx
"use client"

import { useMemo, useState } from "react"
import { useAccount } from "wagmi"
import toast from "react-hot-toast"
import {
  useAverage,
  useMyRating,
  useRate,
  useUpdateRating,
} from "@/hooks/useRatings"
import { useRatingsAllowance } from "@/hooks/useRatingsAllowance"

/** Parse result from Ratings.getRating(...) across ABI variations. */
function parseMyRating(raw: unknown): { score: number; comment: string } {
  if (!Array.isArray(raw)) return { score: 0, comment: "" }
  const arr = raw as any[]
  if (typeof arr[0] === "string" && arr[0]?.startsWith?.("0x")) {
    const score = Number(arr[2] ?? 0)
    const comment = String(arr[3] ?? "")
    return { score: Number.isFinite(score) ? score : 0, comment }
  }
  const score = Number(arr[0] ?? 0)
  const comment = String(arr[1] ?? arr[3] ?? "")
  return { score: Number.isFinite(score) ? score : 0, comment }
}

const ALLOW_SELF_RATING = false

function Star({
  filled,
  onEnter,
  onLeave,
  onClick,
}: {
  filled: boolean
  onEnter?: () => void
  onLeave?: () => void
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-label={filled ? "filled star" : "empty star"}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`transition transform active:scale-95`}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        className={filled ? "text-pink-500" : "text-pink-500/30"}
        fill="currentColor"
      >
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    </button>
  )
}

export default function RatingWidget({
  creator,
  owner, // pass the creator's owner address if you want to block self-rating precisely
}: {
  creator: `0x${string}`
  owner?: `0x${string}` | undefined
}) {
  const { address } = useAccount()

  // Reads
  const { data: avgX100 } = useAverage(creator)
  const { data: myRaw } = useMyRating(creator)
  const parsed = parseMyRating(myRaw)
  const hasExisting = (parsed.score ?? 0) > 0

  // Local UI state
  const [score, setScore] = useState<number>(hasExisting ? parsed.score : 5)
  const [hover, setHover] = useState<number>(0)
  const [comment, setComment] = useState<string>(parsed.comment || "")

  // Fees / approvals
  const { fee, hasAllowance, approveForFee, states } = useRatingsAllowance()

  // Writes
  const { rate } = useRate()
  const { update } = useUpdateRating()

  const avg = avgX100 ? (Number(avgX100) / 100).toFixed(2) : "-"

  const isSelf =
    !!address &&
    !!owner &&
    address.toLowerCase() === owner.toLowerCase()

  const canRate = ALLOW_SELF_RATING ? !!address : (!!address && !isSelf)

  async function onSubmit() {
    if (!address) return toast.error("Connect a wallet first.")
    if (!ALLOW_SELF_RATING && isSelf) return toast.error("You cannot rate your own profile.")

    const clamped = Math.max(1, Math.min(5, Math.floor(Number(score) || 5)))

    try {
      if ((fee ?? 0n) > 0n && !hasAllowance) {
        const t = toast.loading("Approving USDC for rating fee…")
        await approveForFee?.()
        toast.dismiss(t)
        toast.success("Approval confirmed")
      }

      const t2 = toast.loading(hasExisting ? "Updating rating…" : "Submitting rating…")
      if (hasExisting) {
        await update(creator, clamped, comment || parsed.comment)
      } else {
        await rate(creator, clamped, comment)
      }
      toast.dismiss(t2)
      toast.success("Rating saved")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to rate")
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">Rate this creator</div>
        <div className="text-sm opacity-70">
          Average: <span className="font-semibold">{avg}</span>
          {avg !== "-" && " / 5"}
        </div>
      </div>

      {/* Star row */}
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map((n) => {
          const filled = (hover || score) >= n
          return (
            <Star
              key={n}
              filled={filled}
              onEnter={() => setHover(n)}
              onLeave={() => setHover(0)}
              onClick={() => setScore(n)}
            />
          )
        })}
        <span className="ml-2 text-sm opacity-70">{score}/5</span>
      </div>

      {/* Comment + submit */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          placeholder="Add a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
        />
        <button
          className="btn"
          onClick={onSubmit}
          disabled={!canRate || states.loading || states.approving}
          title={
            !address
              ? "Connect wallet"
              : !ALLOW_SELF_RATING && isSelf
              ? "You cannot rate yourself"
              : states.loading
              ? "Loading fee…"
              : states.approving
              ? "Approving…"
              : ""
          }
        >
          {hasExisting ? "Update rating" : "Submit rating"}
        </button>
      </div>

      <div className="text-sm opacity-70">
        Fee:&nbsp;
        <span className="font-medium">
          {fee !== undefined ? (Number(fee) / 1e6).toFixed(2) : "--"} USDC
        </span>
      </div>
    </div>
  )
}
