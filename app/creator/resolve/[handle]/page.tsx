// app/creator/resolve/[handle]/page.tsx
import { redirect } from "next/navigation"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

import * as ADDR from "@/lib/addresses"
import ProfileRegistryAbi from "@/abi/ProfileRegistry.json"

const pc = createPublicClient({ chain: base, transport: http() })

export default async function ResolveHandlePage({ params }: { params: { handle: string } }) {
  const handle = decodeURIComponent(params.handle || "").replace(/^@/, "")
  let id = 0n
  try {
    const res = await pc.readContract({
      address: ADDR.PROFILE_REGISTRY,
      abi: ProfileRegistryAbi as any,
      functionName: "getProfileByHandle",
      args: [handle],
    })
    id = typeof res === "bigint" ? res : Array.isArray(res) ? ((res as any[]).find((v) => typeof v === "bigint") || 0n) : 0n
  } catch {}

  if (id > 0n) redirect(`/creator/${id.toString()}`)
  redirect(`/creator`) // fallback to onboarding
}
