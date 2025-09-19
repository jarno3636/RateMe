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

export default function PayButton(props: Props) {
  const [busy, setBusy] = useState<"preview" | "approve" | "pay" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const isSub = props.mode === "subscribe"
  const periods = (isSub && props.periods ? Math.max(1, props.periods) : 1) as number

  // Fetch static info for the price preview pill (plan/post)
  const { data: plan } = isSub ? usePlan(props.planId) : { data: undefined }
  const { data: post } = !isSub ? usePost(props.postId) : { data: undefined }

  // Preview hooks
  const subPreview = isSub ? usePreviewSubscribe(props.planId, periods) : null
  const buyPreview = !isSub ? usePreviewBuy(props.postId) : null

  // Actions
  const { approve, isPending: approving } = useApproveErc20()
  const { subscribe, isPending: payingSub } = useSubscribe()
  const { buy, isPending: payingBuy } = useBuyPost()

  const paying = payingSub || payingBuy
  const disabled = !!busy || approving || paying

  // Basic price data for the pill
  const priceInfo = useMemo(() => {
    if (isSub && plan) {
      const token = plan[1] as `0x${string}`
      const pricePerPeriod = plan[2] as bigint
      return { token, amount: pricePerPeriod, isNative: token === "0x0000000000000000000000000000000000000000" }
    }
    if (!isSub && post) {
      const token = post[1] as `0x${string}`
      const price = post[2] as bigint
      return { token, amount: price, isNative: token === "0x0000000000000000000000000000000000000000" }
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

      if (preview.isNative) {
        // Direct pay
        setBusy("pay")
        const hash = isSub
          ? await subscribe((props as SubscribeProps).planId, periods)
          : await buy((props as BuyProps).postId)
        setBusy(null)
        setOk("Success!")
        props.onSuccess?.(hash as `0x${string}`)
        return
      }

      // ERC20 path — check allowance
      if (!preview.okAllowance) {
        setBusy("approve")
        const amount = isSub ? preview.total : preview.price
        await approve(preview.token as `0x${string}`, amount)
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
        decimals={isSub ? undefined : undefined /* preview will format later if needed */}
        symbol={props.symbolOverride}
        isNative={priceInfo.isNative}
        emphasis
      />
    )
  }, [priceInfo, isSub, props.symbolOverride])

  return (
    <div className={["inline-flex flex-col items-stretch gap-2", props.className].join(" ")}>
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
