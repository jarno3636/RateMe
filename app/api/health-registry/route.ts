// /app/api/health-registry/route.ts
import { NextResponse } from "next/server"
import { publicClient } from "@/lib/chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"

const REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!REGISTRY) throw new Error("Missing NEXT_PUBLIC_PROFILE_REGISTRY")

    // Simple on-chain read to verify connectivity
    const count = (await publicClient.readContract({
      abi: ProfileRegistry as any,
      address: REGISTRY,
      functionName: "profileCount",
    })) as bigint

    return NextResponse.json({
      ok: true,
      profileCount: count.toString(),
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "health check failed",
      },
      { status: 500 }
    )
  }
}
