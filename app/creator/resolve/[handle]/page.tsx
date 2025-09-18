// app/creator/resolve/[handle]/page.tsx
import "server-only"
import { redirect } from "next/navigation"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

import * as ADDR from "@/lib/addresses"
import ProfileRegistryAbi from "@/abi/ProfileRegistry.json"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"

export const dynamic = "force-dynamic" // redirects depend on live chain/KV

const pc = createPublicClient({ chain: base, transport: http() })

const HANDLE_RE = /^[a-z0-9_.-]{1,32}$/i
const CACHE_TTL_SEC = 120 // small but helpful

function normalizeHandle(raw: string) {
  return decodeURIComponent(raw || "").trim().replace(/^@/, "")
}
function isNumericId(s: string) {
  return /^[0-9]+$/.test(s)
}

export default async function ResolveHandlePage({
  params,
}: { params: { handle: string } }) {
  const raw = String(params.handle ?? "")
  const handle = normalizeHandle(raw)

  // If user pasted a numeric "handle", treat it as an ID directly.
  if (isNumericId(handle)) {
    try {
      const asBig = BigInt(handle)
      if (asBig > 0n) redirect(`/creator/${asBig.toString()}`)
    } catch {}
    redirect("/creator")
  }

  // Quick validation to avoid junk calls
  if (!HANDLE_RE.test(handle)) {
    redirect("/creator")
  }

  // If the registry addr is missing, don’t blow up—send to onboarding
  if (!ADDR.PROFILE_REGISTRY) {
    redirect("/creator")
  }

  const cacheKey = `onlystars:resolve:${ADDR.PROFILE_REGISTRY}:${handle.toLowerCase()}`
  // 1) KV cache
  const cached = await kvGetJSON<{ id: string }>(cacheKey)
  if (cached?.id) {
    redirect(`/creator/${cached.id}`)
  }

  // 2) Chain lookup (best-effort)
  let id = 0n
  try {
    const res = await pc.readContract({
      address: ADDR.PROFILE_REGISTRY,
      abi: ProfileRegistryAbi as any,
      functionName: "getProfileByHandle",
      args: [handle],
    })
    if (typeof res === "bigint") {
      id = res
    } else if (Array.isArray(res)) {
      const cand = (res as any[]).find((v) => typeof v === "bigint" && v > 0n)
      if (cand) id = cand as bigint
    }
  } catch {
    // ignore and fall through to onboarding
  }

  if (id > 0n) {
    // cache for a short time
    await kvSetJSON(cacheKey, { id: id.toString() }, CACHE_TTL_SEC)
    redirect(`/creator/${id.toString()}`)
  }

  // Unknown handle → onboarding
  redirect("/creator")
}
