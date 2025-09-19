// /app/api/discover/route.ts
import { NextResponse } from "next/server";
import { kvGetJSON, kvSetJSON } from "@/lib/kv";
import { publicServerClient as publicClient } from "@/lib/chainServer";
import * as ADDR from "@/lib/addresses";

// ✅ JSON ABIs (paths must match your repo)
import ProfileRegistry from "@/abi/ProfileRegistry.json";
import CreatorHub from "@/abi/CreatorHub.json";
import Ratings from "@/abi/Ratings.json";

export const dynamic = "force-dynamic"; // caching handled via KV + headers
export const runtime = "nodejs";

type WireTuple = [
  string[],        // ids (as strings)
  `0x${string}`[], // owners
  string[],        // handles
  string[],        // displayNames
  string[],        // avatarURIs
  string[],        // bios
  string[],        // fids (as strings)
  string[],        // createdAts (unix, as strings)
  string           // nextCursor
];

const DEFAULT_TTL_SECONDS = 45; // short TTL for snappy UX

/* ----------------------------- CORS helpers ----------------------------- */
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Vary", "Origin");
  return res;
}

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

/* --------------------------------- GET --------------------------------- */
export async function GET(req: Request) {
  try {
    const REGISTRY = ADDR.PROFILE_REGISTRY;
    const HUB = ADDR.HUB;         // optional
    const RATINGS = ADDR.RATINGS; // optional

    if (!REGISTRY) {
      return withCORS(
        NextResponse.json(
          { ok: false, error: "Missing NEXT_PUBLIC_PROFILE_REGISTRY" },
          { status: 500 }
        )
      );
    }

    const { searchParams } = new URL(req.url);
    const cursorStr = (searchParams.get("cursor") ?? "0").trim();
    const sizeStr = (searchParams.get("size") ?? "12").trim();

    let cursor = 0n;
    let size = 12n;
    try { cursor = BigInt(cursorStr); } catch {}
    try { size = BigInt(sizeStr); } catch {}

    if (cursor < 0n) cursor = 0n;
    if (size < 1n) size = 1n;
    if (size > 48n) size = 48n;

    // Namespaced by registry so multiple deployments don't collide
    const cacheKey = `onlystars:${REGISTRY}:discover:v2:c${cursor}:s${size}`;

    // 1) KV cache
    const cached = await kvGetJSON<{ data: WireTuple; badges: string[][]; meta: any }>(cacheKey);
    if (cached?.data) {
      return withCORS(
        NextResponse.json(
          { ok: true, ...cached },
          {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "x-kv-cache": "HIT",
              // small public hint; API remains dynamic
              "cache-control": "public, max-age=10, s-maxage=10, stale-while-revalidate=30",
            },
          }
        )
      );
    }

    // 2) Chain read (page)
    const res = (await publicClient.readContract({
      address: REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "listProfilesFlat",
      args: [cursor, size],
    })) as unknown as [
      bigint[],            // ids
      `0x${string}`[],     // owners
      string[],            // handles
      string[],            // displayNames
      string[],            // avatarURIs
      string[],            // bios
      bigint[],            // fids
      bigint[],            // createdAts (unix)
      bigint               // nextCursor
    ];

    const idsBn        = res?.[0] ?? [];
    const owners       = res?.[1] ?? [];
    const handles      = res?.[2] ?? [];
    const names        = res?.[3] ?? [];
    const avatars      = res?.[4] ?? [];
    const bios         = res?.[5] ?? [];
    const fidsBn       = res?.[6] ?? [];
    const createdBn    = res?.[7] ?? [];
    const nextCursorBn = res?.[8] ?? 0n;

    const data: WireTuple = [
      idsBn.map(String),
      owners,
      handles,
      names,
      avatars,
      bios,
      fidsBn.map(String),
      createdBn.map(String),
      String(nextCursorBn),
    ];

    // 3) Optional premium badge data (parallel + resilient)
    const wantPlans = Boolean(HUB);
    const wantRatings = Boolean(RATINGS);

    const planCountsPromise = (async (): Promise<number[]> => {
      if (!wantPlans) return Array(owners.length).fill(0);
      const reads = owners.map((owner) =>
        publicClient.readContract({
          address: HUB!,
          abi: CreatorHub as any,
          functionName: "getCreatorPlanIds",
          args: [owner],
        }) as Promise<bigint[]>
      );
      const settled = await Promise.allSettled(reads);
      return settled.map((r) => (r.status === "fulfilled" ? (r.value?.length ?? 0) : 0));
    })();

    const avgX100sPromise = (async (): Promise<number[]> => {
      if (!wantRatings) return Array(owners.length).fill(0);
      const reads = owners.map((owner) =>
        publicClient.readContract({
          address: RATINGS!,
          abi: Ratings as any,
          functionName: "getAverage",
          args: [owner],
        }) as Promise<bigint>
      );
      const settled = await Promise.allSettled(reads);
      return settled.map((r) => (r.status === "fulfilled" ? Number(r.value ?? 0n) : 0));
    })();

    const [planCounts, avgX100s] = await Promise.all([planCountsPromise, avgX100sPromise]);

    // 4) Compute badges per profile (ids-aligned)
    const nowSec = Math.floor(Date.now() / 1000);
    const badges: string[][] = owners.map((_, i) => {
      const out: string[] = [];
      const createdSec = Number(createdBn[i] ?? 0n);
      const fid = Number(fidsBn[i] ?? 0n);
      const avg = avgX100s[i] ?? 0;
      const plans = planCounts[i] ?? 0;

      if (fid > 0) out.push("verified");
      if (createdSec > 0 && nowSec - createdSec <= 14 * 24 * 3600) out.push("new");
      if (plans >= 1) out.push("pro");
      if (avg >= 480) out.push("top");
      if (nowSec - createdSec <= 60 * 24 * 3600 && avg >= 420) out.push("rising");

      return out;
    });

    const payload = { data, badges, meta: { planCounts, avgX100s } };

    // 5) KV cache (best-effort)
    await kvSetJSON(cacheKey, payload, DEFAULT_TTL_SECONDS).catch(() => null);

    return withCORS(
      NextResponse.json(
        { ok: true, ...payload },
        {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "x-kv-cache": "MISS",
            "cache-control": "public, max-age=10, s-maxage=10, stale-while-revalidate=30",
          },
        }
      )
    );
  } catch (err: any) {
    return withCORS(
      NextResponse.json(
        { ok: false, error: err?.message || "discover failed" },
        { status: 500 }
      )
    );
  }
}
