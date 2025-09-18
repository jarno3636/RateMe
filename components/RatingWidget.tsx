// /components/RatingWidget.tsx
"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useAccount } from "wagmi"
import toast from "react-hot-toast"
import {
  useAverage,
  useMyRating,
  useRate,
  useUpdateRating,
  useRatingStats, // ← add this for count
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
const MAX_COMMENT = 240

function Star({
  index,
  filled,
  setHover,
  setScore,
}: {
  index: number
  filled: boolean
  setHover: (n: number) => void
  setScore: (n: number) => void
}) {
  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        setScore(index)
      }
      if (e.key === "ArrowRight") setHover(Math.min(5, index + 1))
      if (e.key === "ArrowLeft") setHover(Math.max(1, index - 1))
    },
    [index, setHover, setScore]
  )

  return (
    <button
      type="button"
      aria-label={`${index} star${index > 1 ? "s" : ""}`}
      onMouseEnter={() => setHover(index)}
      onMouseLeave={() => setHover(0)}
      onFocus={() => setHover(index)}
      onBlur={() => setHover(0)}
      onClick={() => setScore(index)}
      onKeyDown={onKey}
      className="rounded-sm transition will-change-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        className={filled ? "text-pink-500" : "text-pink-500/30"}
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    </button>
  )
}

export default function RatingWidget({
  creator,
  owner, // (optional) exact owner addr to block self-rating
}: {
  creator: `0x${string}`
  owner?: `0x${string}` | undefined
}) {
  const { address } = useAccount()

  // Reads
  const { data: avgX100, isLoading: avgLoading } = useAverage(creator)
  const { data: countTuple } = useRatingStats(creator) // [count, totalScore]
  const ratingCount = Number((countTuple as any)?.[0] ?? 0)
  const { data: myRaw } = useMyRating(creator)
  const parsed = useMemo(() => parseMyRating(myRaw), [myRaw])
  const hasExisting = (parsed.score ?? 0) > 0

  // Local UI state
  const [score, setScore] = useState<number>(hasExisting ? parsed.score : 5)
  const [hover, setHover] = useState<number>(0)
  const [comment, setComment] = useState<string>(parsed.comment || "")

  // Sync local state when on-chain rating arrives/changes
  useEffect(() => {
    if (hasExisting) {
      setScore(parsed.score)
      setComment(parsed.comment || "")
    }
  }, [hasExisting, parsed.score, parsed.comment])

  // Fees / approvals
  const { fee, hasAllowance, approveForFee, states } = useRatingsAllowance()

  // Writes
  const { rate, isPending: isRating } = useRate()
  const { update, isPending: isUpdating } = useUpdateRating()

  const avg = useMemo(
    () => (avgX100 || avgLoading ? (avgX100 ? (Number(avgX100) / 100).toFixed(2) : "…") : "-"),
    [avgX100, avgLoading]
  )

  const isSelf =
    !!address &&
    !!owner &&
    address.toLowerCase() === owner.toLowerCase()

  const clampedScore = Math.max(1, Math.min(5, Math.floor(Number(score) || 5)))
  const commentTrimmed = comment.slice(0, MAX_COMMENT)

  // Disable submit if nothing changed
  const unchanged =
    hasExisting &&
    clampedScore === (parsed.score || 0) &&
    commentTrimmed === (parsed.comment || "")

  const canRate = ALLOW_SELF_RATING ? !!address : (!!address && !isSelf)
  const submitting = states.approving || isRating || isUpdating

  async function onSubmit() {
    if (!address) return toast.error("Connect a wallet first.")
    if (!ALLOW_SELF_RATING && isSelf) return toast.error("You cannot rate your own profile.")
    if (unchanged) return toast.error("No changes to save.")

    try {
      // If there’s a USDC fee, ensure approval first
      if ((fee ?? 0n) > 0n && !hasAllowance) {
        const t = toast.loading("Approving USDC for rating fee…")
        await approveForFee?.()
        toast.dismiss(t)
        toast.success("Approval confirmed")
      }

      const t2 = toast.loading(hasExisting ? "Updating rating…" : "Submitting rating…")
      if (hasExisting) {
        await update(creator, clampedScore, commentTrimmed || parsed.comment)
      } else {
        await rate(creator, clampedScore, commentTrimmed)
      }
      toast.dismiss(t2)
      toast.success("Rating saved")
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to rate")
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">Rate this creator</div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs">
          <span className="opacity-70">Average</span>
          <span className="font-semibold tabular-nums">
            {avg}{avg !== "-" && avg !== "…" ? " / 5" : ""}
          </span>
          <span aria-hidden>•</span>
          <span className="opacity-70">{ratingCount} {ratingCount === 1 ? "rating" : "ratings"}</span>
        </div>
      </div>

      {/* Star row */}
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Select rating">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || clampedScore) >= n
            return (
              <Star
                key={n}
                index={n}
                filled={filled}
                setHover={setHover}
                setScore={setScore}
              />
            )
          })}
        </div>
        <span className="text-sm opacity-70">{clampedScore}/5</span>
        {hasExisting && (
          <span className="ml-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-pink-200">
            You rated
          </span>
        )}
      </div>

      {/* Comment + submit */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            placeholder="Add a comment (optional, max 240 chars)"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
            className="min-w-[220px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
            aria-label="Rating comment"
            maxLength={MAX_COMMENT}
          />
          <div className="mt-1 text-right text-[11px] opacity-60">
            {commentTrimmed.length}/{MAX_COMMENT}
          </div>
        </div>

        <button
          className="btn"
          onClick={onSubmit}
          disabled={!canRate || submitting || states.loading || unchanged}
          title={
            !address
              ? "Connect wallet"
              : !ALLOW_SELF_RATING && isSelf
              ? "You cannot rate yourself"
              : states.loading
              ? "Loading fee…"
              : states.approving
              ? "Approving…"
              : unchanged
              ? "No changes"
              : isRating || isUpdating
              ? "Submitting…"
              : ""
          }
        >
          {submitting
            ? hasExisting
              ? "Updating…"
              : "Submitting…"
            : hasExisting
            ? "Update rating"
            : "Submit rating"}
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
