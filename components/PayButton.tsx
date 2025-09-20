// /components/PayButton.tsx
"use client"

import { useMemo, useState } from "react"
import PricePill from "./PricePill"
import {
  usePreviewSubscribe,
  usePreviewBuy,
  useApproveErc20,
} from "@/hooks/useCreatorHubExtras"
import {
  useSubscribe,
  useBuyPost,
  usePlan,
  usePost,
} from "@/hooks/useCreatorHub"

type BaseProps = {
  className?: string
  onSuccess?: (txHash: `0x${string}`) => void
  symbolOverride?: string // e.g. "USDC"
}

type SubscribeProps = BaseProps & {
  mode: "subscribe"
  planId: bigint
  periods?: number
}

type BuyProps = BaseProps & {
  mode: "buyPost"
  postId: bigint
}

type Props = SubscribeProps | BuyProps

// Narrowing helpers
function isSubscribe(p: Props): p is SubscribeProps {
  return p.mode === "subscribe"
}
function isBuy(p: Props): p is BuyProps {
  return p.mode === "buyPost"
}

// Preview type guards
function hasTotal(p: unknown): p is { total: bigint } {
  return !!p && typeof p === "object" && "total" in (p as any)
}
function hasPrice(p: unknown): p is { price: bigint } {
  return !!p && typeof p === "object" && "price" in (p as any)
}
function hasOkAllowance(p: unknown): p is { okAllowance?: boolean } {
  return !!p && typeof p === "object" && "okAllowance" in (p as any)
}
function hasToken(p: unknown): p is { token: `0x${string}` } {
  return !!p && typeof p === "object" && "token" in (p as any)
}

// Lightweight tuple typings
type MaybePlanTuple =
  | readonly [
      unknown,
      `0x${string}` | undefined,
      bigint | undefined,
      number | bigint | undefined,
      boolean | undefined,
      string | undefined,
      string | undefined
    ]
  | undefined

type MaybePostTuple =
  | readonly [
      unknown,
      `0x${string}` | undefined,
      bigint | undefined,
      boolean | undefined,
      boolean | undefined,
      string | undefined
    ]
  | undefined

export default function PayButton(props: Props) {
  const [busy, setBusy] = useState<"preview" | "approve" | "pay" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const isSub = isSubscribe(props)
  const periods = isSub && props.periods ? Math.max(1, props.periods) : 1

  // Fetch static info for the price preview pill (plan/post)
  const { data: planData } = isSub ? usePlan(props.planId) : { data: undefined as unknown }
  const { data: postData } = isBuy(props) ? usePost(props.postId) : { data: undefined as unknown }

  const plan = planData as unknown as MaybePlanTuple
  const post = postData as unknown as MaybePostTuple

  // Preview hooks
  const subPreview = isSub ? usePreviewSubscribe(props.planId, periods) : null
  const buyPreview = isBuy(props) ? usePreviewBuy(props.postId) : null

  // Actions
  const { approve, isPending: approving } = useApproveErc20()
  const { subscribe, isPending: payingSub } = useSubscribe()
  const { buy, isPending: payingBuy } = useBuyPost()

  const paying = payingSub || payingBuy
  const disabled = !!busy || approving || paying

  // Basic price data for the pill
  const priceInfo = useMemo(() => {
    if (isSub && plan) {
      const token = (plan?.[1] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`
      const amount = (plan?.[2] ?? 0n) as bigint
      const isNative = token === "0x0000000000000000000000000000000000000000"
      return { token, amount, isNative }
    }
    if (!isSub && post) {
      const token = (post?.[1] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`
      const amount = (post?.[2] ?? 0n) as bigint
      const isNative = token === "0x0000000000000000000000000000000000000000"
      return { token, amount, isNative }
    }
    return null
  }, [isSub, plan, post])

  async function handleClick() {
    setError(null)
    setOk(null)

    try {
      setBusy("preview")
      const preview = isSub ? await subPreview!.run() : await buyPreview!.run()
      setBusy(null)

      if (!preview) throw new Error("Unable to calculate payment preview.")

      // Native path: no approvals
      if ((preview as any).isNative) {
        setBusy("pay")
        const hash = isSub
          ? await subscribe((props as SubscribeProps).planId, periods)
          : await buy((props as BuyProps).postId)
        setBusy(null)
        setOk("Success!")
        props.onSuccess?.(hash as `0x${string}`)
        return
      }

      // ERC20 path — check allowance (treat missing okAllowance as false)
      const needsApproval = hasOkAllowance(preview) ? !preview.okAllowance : true
      if (needsApproval) {
        setBusy("approve")
        const amount =
          isSub
            ? (hasTotal(preview) ? preview.total : hasPrice(preview) ? preview.price : 0n)
            : (hasPrice(preview) ? preview.price : 0n)
        const token = hasToken(preview) ? preview.token : ("0x0000000000000000000000000000000000000000" as `0x${string}`)
        await approve(token, amount)
        setBusy(null)
      }

      // Pay after allowance is sufficient
      setBusy("pay")
      const hash = isSub
        ? await subscribe((props as SubscribeProps).planId, periods)
        : await buy((props as BuyProps).postId)
      setBusy(null)
      setOk("Success!")
      props.onSuccess?.(hash as `0x${string}`)
    } catch (e: any) {
      setBusy(null)
      setError(e?.message || String(e))
    }
  }

  const label = useMemo(() => {
    if (busy === "preview") return "Checking…"
    if (busy === "approve" || approving) return "Approving…"
    if (busy === "pay" || paying) return isSub ? "Subscribing…" : "Buying…"
    return isSub ? "Subscribe" : "Buy"
  }, [busy, approving, paying, isSub])

  const pill = useMemo(() => {
    if (!priceInfo) return null
    return (
      <PricePill
        value={priceInfo.amount}
        /* removed decimals to satisfy exactOptionalPropertyTypes */
        symbol={props.symbolOverride}
        isNative={priceInfo.isNative}
        emphasis
      />
    )
  }, [priceInfo, props.symbolOverride])

  return (
    <div className={["inline-flex flex-col items-stretch gap-2", props.className].filter(Boolean).join(" ")}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition",
          "border border-pink-500/70 bg-pink-500/10 hover:bg-pink-500/20",
          "focus:outline-none focus:ring-2 focus:ring-pink-500/50",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      >
        {pill}
        <span>{label}</span>
      </button>
      {error && <div className="text-xs text-red-400">{error}</div>}
      {ok && <div className="text-xs text-green-400">{ok}</div>}
    </div>
  )
}
