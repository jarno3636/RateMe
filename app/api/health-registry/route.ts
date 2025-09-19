// /app/api/health-registry/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getAddress } from "viem";
import { publicServerClient as rpc } from "@/lib/chainServer";
import ProfileRegistry from "@/abi/ProfileRegistry.json";

const REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined;

export const dynamic = "force-dynamic"; // always live

function noStoreHeaders() {
  return {
    "cache-control": "no-store, no-cache, must-revalidate",
    "content-type": "application/json; charset=utf-8",
  };
}

/** Core probe: validates env, contract code presence, and basic liveness. */
async function probe() {
  if (!REGISTRY) {
    throw new Error("Missing NEXT_PUBLIC_PROFILE_REGISTRY");
  }

  // Verify contract code exists at the address (helps catch bad envs)
  const code = await rpc.getCode({ address: REGISTRY });
  if (!code || code === "0x") {
    throw new Error(`No contract code at REGISTRY ${REGISTRY}`);
  }

  // Read a cheap view + latest block info in parallel
  const [count, blockNumber, block] = await Promise.all([
    rpc.readContract({
      abi: ProfileRegistry as any,
      address: REGISTRY,
      functionName: "profileCount",
      args: [], // explicit for ABI compatibility
    }) as Promise<bigint>,
    rpc.getBlockNumber(),
    rpc.getBlock(), // latest block (includes timestamp)
  ]);

  const chainId = rpc.chain?.id ?? null;
  const chainName = rpc.chain?.name ?? "base";
  const blockTsSec = Number(block.timestamp); // bigint -> number (fits for recent blocks)
  const nowSec = Math.floor(Date.now() / 1000);
  const lagSec = Math.max(0, nowSec - blockTsSec);

  return {
    ok: true,
    chainId,
    chainName,
    registry: getAddress(REGISTRY),
    profileCount: count.toString(),
    blockNumber: blockNumber.toString(),
    blockTimestamp: blockTsSec,
    blockLagSec: lagSec, // RPC freshness hint
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
      { status: 500, headers: noStoreHeaders() },
    );
  }
}

/** Lightweight HEAD for uptime monitors (no body) */
export async function HEAD(_req: NextRequest) {
  try {
    await probe();
    return new NextResponse(null, { status: 200, headers: { "cache-control": "no-store, no-cache, must-revalidate" } });
  } catch {
    return new NextResponse(null, { status: 500, headers: { "cache-control": "no-store, no-cache, must-revalidate" } });
  }
}
