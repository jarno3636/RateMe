// app/creator/resolve/[handle]/page.tsx
import "server-only"
import { redirect } from "next/navigation"

import { publicServerClient } from "@/lib/chainServer"
import * as ADDR from "@/lib/addresses"
import ProfileRegistryAbi from "@/abi/ProfileRegistry.json"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"

export const dynamic = "force-dynamic" // depends on live chain & KV

/** Accepts 1–32 chars, alphanumerics plus _ . - ; case-insensitive */
const HANDLE_RE = /^[a-z0-9_.-]{1,32}$/i
const CACHE_TTL_SEC = 120

const REGISTRY = ADDR.REGISTRY ?? ADDR.PROFILE_REGISTRY // tolerate older alias

function normalizeHandle(raw: string) {
  return decodeURIComponent(String(raw || "")).trim().replace(/^@/, "")
}
function isNumericId(s: string) {
  return /^[0-9]+$/.test(s)
}
function cacheKey(handle: string) {
  return `onlystars:resolve:${REGISTRY ?? "unknown"}:${handle.toLowerCase()}`
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
  if (!REGISTRY) {
    redirect("/creator")
  }

  // 1) KV cache hit?
  try {
    const cached = await kvGetJSON<{ id: string }>(cacheKey(handle))
    if (cached?.id) {
      redirect(`/creator/${cached.id}`)
    }
  } catch {
    // soft-fail: proceed to chain lookup
  }

  // 2) Chain lookup (best-effort, server client w/ batching)
  let id = 0n
  try {
    const res = await publicServerClient.readContract({
      address: REGISTRY,
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
    // ignore; fall through to onboarding
  }

  if (id > 0n) {
    // Cache briefly to smooth repeated resolves
    try {
      await kvSetJSON(cacheKey(handle), { id: id.toString() }, CACHE_TTL_SEC)
    } catch {
      /* ignore cache errors */
    }
    redirect(`/creator/${id.toString()}`)
  }

  // Unknown handle → onboarding
  redirect("/creator")
}
