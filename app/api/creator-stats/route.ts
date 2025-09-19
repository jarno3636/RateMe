// /app/api/creator-stats/route.ts
import { NextResponse } from "next/server";
import { publicServerClient as publicClient } from "@/lib/chainServer";
import ProfileRegistry from "@/abi/ProfileRegistry.json";
import CreatorHub from "@/abi/CreatorHub.json";
import Ratings from "@/abi/Ratings.json";
import { kvGetJSON, kvSetJSON } from "@/lib/kv";
import * as ADDR from "@/lib/addresses";

export const dynamic = "force-dynamic"; // we manage caching via KV
export const runtime = "nodejs";        // viem http + server-side batching

/** Cache TTL (seconds) */
const TTL_SEC = 45;

type StatsPayload = {
  subs: number;           // placeholder (indexer-ready)
  sales: number;          // placeholder (indexer-ready)
  mrr: number;            // summed active plan pricePerPeriod (USDC, 6dp)
  ratingAvgX100: number;  // avg * 100
  ratingCount: number;
  planCount?: number;
  postCount?: number;
};

function empty(): StatsPayload {
  return { subs: 0, mrr: 0, sales: 0, ratingAvgX100: 0, ratingCount: 0 };
}

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  // short edge/CDN hint; API remains dynamic because we KV it
  if (!headers.has("cache-control")) {
    headers.set(
      "cache-control",
      "public, max-age=15, s-maxage=15, stale-while-revalidate=60"
    );
  }
  return new NextResponse(JSON.stringify(body), { ...init, headers });
}

export async function GET(req: Request) {
  try {
    // -------- Parse & guard
    const { searchParams } = new URL(req.url);
    const idStr = (searchParams.get("id") || "").trim();
    let id = 0n;
    try {
      id = idStr ? BigInt(idStr) : 0n;
    } catch {
      id = 0n;
    }

    if (!id) return json(empty(), { headers: { "cache-control": "no-store" } });

    // -------- Env / address sanity (don’t explode on misconfig)
    const REGISTRY = ADDR.PROFILE_REGISTRY;
    const HUB = ADDR.HUB;
    const RATINGS = ADDR.RATINGS;
    if (!REGISTRY || !HUB || !RATINGS) {
      return json(empty(), { headers: { "cache-control": "no-store" } });
    }

    // -------- KV cache (namespaced by registry for multi-env safety)
    const cacheKey = `onlystars:${REGISTRY}:creator-stats:id:${idStr}`;
    const cached = await kvGetJSON<StatsPayload>(cacheKey).catch(() => null);
    if (cached) return json(cached);

    // -------- Resolve owner from profile
    // getProfile(id) -> (owner, handle, name, avatar, bio, fid, createdAt)
    let owner: `0x${string}` | undefined;
    try {
      const prof = (await publicClient.readContract({
        address: REGISTRY,
        abi: ProfileRegistry as any,
        functionName: "getProfile",
        args: [id],
      })) as unknown as [`0x${string}`, ...unknown[]];

      owner = prof?.[0] as `0x${string}` | undefined;
    } catch {
      owner = undefined;
    }

    if (
      !owner ||
      owner === "0x0000000000000000000000000000000000000000"
    ) {
      const payload = empty();
      await kvSetJSON(cacheKey, payload, TTL_SEC).catch(() => null);
      return json(payload);
    }

    // -------- Parallel reads (resilient)
    const [avgRes, statsRes, planIdsRes, postIdsRes] = await Promise.allSettled([
      publicClient.readContract({
        address: RATINGS,
        abi: Ratings as any,
        functionName: "getAverage",
        args: [owner],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: RATINGS,
        abi: Ratings as any,
        functionName: "getStats",
        args: [owner],
      }) as Promise<[bigint, bigint]>, // [count, totalScore]
      publicClient.readContract({
        address: HUB,
        abi: CreatorHub as any,
        functionName: "getCreatorPlanIds",
        args: [owner],
      }) as Promise<bigint[]>,
      publicClient.readContract({
        address: HUB,
        abi: CreatorHub as any,
        functionName: "getCreatorPostIds",
        args: [owner],
      }) as Promise<bigint[]>,
    ]);

    const avgX100Bn =
      avgRes.status === "fulfilled" ? avgRes.value || 0n : 0n;

    const ratingStats =
      statsRes.status === "fulfilled" ? statsRes.value : [0n, 0n];

    const planIds =
      planIdsRes.status === "fulfilled" ? planIdsRes.value || [] : [];

    const postIds =
      postIdsRes.status === "fulfilled" ? postIdsRes.value || [] : [];

    const ratingAvgX100 = Number(avgX100Bn);
    const ratingCount = Number(ratingStats?.[0] ?? 0n);

    // -------- Compute MRR as sum of active plan pricePerPeriod (USDC 6dp)
    let mrrUnits = 0n;
    if (planIds.length > 0) {
      const details = await Promise.allSettled(
        planIds.map((pid) =>
          publicClient.readContract({
            address: HUB,
            abi: CreatorHub as any,
            functionName: "plans",
            args: [pid],
          }) as Promise<
            [
              `0x${string}`, // creator
              `0x${string}`, // token
              bigint,        // pricePerPeriod
              bigint,        // periodDays
              boolean,       // active
              string,        // name
              string         // metadataURI
            ]
          >
        )
      );

      for (const d of details) {
        if (d.status !== "fulfilled") continue;
        const price = BigInt(d.value?.[2] ?? 0n);
        const active = Boolean(d.value?.[4]);
        if (active && price > 0n) mrrUnits += price;
      }
    }

    const payload: StatsPayload = {
      subs: 0, // requires indexer — keep stable
      sales: 0, // requires indexer — keep stable
      mrr: Number(mrrUnits) / 1e6,
      ratingAvgX100,
      ratingCount,
      planCount: planIds.length,
      postCount: postIds.length,
    };

    await kvSetJSON(cacheKey, payload, TTL_SEC).catch(() => null);

    return json(payload);
  } catch (e) {
    // Keep shape stable on any failure
    return json(empty(), { headers: { "cache-control": "no-store" } });
  }
}
