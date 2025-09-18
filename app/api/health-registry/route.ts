// /app/api/health-registry/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { publicClient } from "@/lib/chain";
import ProfileRegistry from "@/abi/ProfileRegistry.json";

const REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined;

export const dynamic = "force-dynamic"; // we always want a live check

function noStoreHeaders() {
  return { "cache-control": "no-store, no-cache, must-revalidate" };
}

/** Shared worker to run the health probe */
async function probe() {
  if (!REGISTRY) throw new Error("Missing NEXT_PUBLIC_PROFILE_REGISTRY");
  const [count, blockNumber] = await Promise.all([
    publicClient.readContract({
      abi: ProfileRegistry as any,
      address: REGISTRY,
      functionName: "profileCount",
      args: [], // required even for no-arg functions
    }) as Promise<bigint>,
    publicClient.getBlockNumber(),
  ]);

  return {
    ok: true,
    chainId: publicClient.chain?.id ?? null,
    chainName: publicClient.chain?.name ?? "base",
    profileCount: count.toString(),
    blockNumber: blockNumber.toString(),
  };
}

export async function GET(_req: NextRequest) {
  const t0 = Date.now();
  try {
    const data = await probe();
    const ms = Date.now() - t0;
    return NextResponse.json({ ...data, ms }, { headers: noStoreHeaders() });
  } catch (e: any) {
    const ms = Date.now() - t0;
    return NextResponse.json(
      { ok: false, error: e?.message || "health check failed", ms },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

/** Lightweight HEAD for monitoring systems */
export async function HEAD(_req: NextRequest) {
  try {
    await probe();
    return new NextResponse(null, { status: 200, headers: noStoreHeaders() });
  } catch {
    return new NextResponse(null, { status: 500, headers: noStoreHeaders() });
  }
}
