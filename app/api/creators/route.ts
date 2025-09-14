// app/api/creators/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Creator } from '@/lib/kv';
import { listCreatorsPage, getRatingSummary } from '@/lib/kv';
import { listProfilesFlat } from '@/lib/profileRegistry/reads';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/** ---------- utils ---------- */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
} as const;

function withCors(init?: ResponseInit) {
  return {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...CORS_HEADERS,
    },
  };
}

const Query = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(1).max(50).optional()),
  cursor: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(0).optional()),
  include: z.enum(['rating']).optional(),
  q: z.string().trim().min(1).max(64).optional(), // simple search (handle/displayName)
});

/** ---------- mappers to ensure we return `Creator` (ms timestamps) ---------- */
function mapKVToCreator(item: {
  id: string;
  handle?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  address?: `0x${string}`;
  createdAt?: number;
  updatedAt?: number;
  fid?: number;
}): Creator {
  const now = Date.now();
  const createdAt =
    typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
      ? item.createdAt
      : now;

  return {
    id: String(item.id),
    handle: item.handle || '',
    displayName: item.displayName || '',
    avatarUrl: item.avatarUrl || '',
    bio: item.bio || '',
    address: (item.address ||
      '0x0000000000000000000000000000000000000000') as `0x${string}`,
    createdAt, // ms
    updatedAt:
      typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt)
        ? item.updatedAt
        : now,
    fid: item.fid ?? 0,
  } as Creator;
}

/**
 * Accepts chain items where `createdAt` may be a bigint (seconds) or number (seconds).
 * Normalizes to milliseconds for the app's `Creator` type.
 */
function mapChainToCreator(item: {
  id: bigint;
  owner: `0x${string}`;
  handle: string;
  displayName: string;
  avatarURI: string;
  bio: string;
  fid: bigint;
  createdAt: bigint | number; // seconds on-chain (can be bigint or number depending on reader)
}): Creator {
  const createdSec =
    typeof item.createdAt === 'bigint'
      ? Number(item.createdAt)
      : Number(item.createdAt ?? 0);
  const createdMs = Number.isFinite(createdSec) ? createdSec * 1000 : Date.now();

  return {
    id: item.id.toString(),
    handle: item.handle || '',
    displayName: item.displayName || '',
    avatarUrl: item.avatarURI || '',
    bio: item.bio || '',
    address: item.owner,
    createdAt: createdMs, // ms
    updatedAt: createdMs,
    fid: Number(item.fid ?? 0n),
  } as Creator;
}

/** ---------- handlers ---------- */
export async function OPTIONS() {
  return new NextResponse(null, withCors({ status: 204 }));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Query.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      include: url.searchParams.get('include') ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
    });

    const limit = parsed.success ? parsed.data.limit ?? 12 : 12;
    const cursor = parsed.success ? parsed.data.cursor ?? 0 : 0;
    const include = parsed.success ? parsed.data.include : undefined;
    const q = parsed.success ? parsed.data.q : undefined;
    const qLower = q?.toLowerCase();

    // 1) Primary source: KV
    const page = await listCreatorsPage({ limit, cursor });
    let creators: Creator[] = page.creators.map(mapKVToCreator);
    let nextCursor: number | null =
      typeof page.nextCursor === 'number' ? page.nextCursor : null;

    // 2) If KV is empty, fall back to chain list (first page only)
    if (creators.length === 0 && cursor === 0) {
      try {
        const chain = await listProfilesFlat(0n, BigInt(limit));
        const mapped = chain.items.map(mapChainToCreator);
        creators = mapped;
        nextCursor = chain.nextCursor ? Number(chain.nextCursor) : null;
      } catch {
        // ignore chain errors; we'll just return empty
      }
    }

    // 3) Optional search filter (local, lightweight)
    if (qLower && creators.length) {
      creators = creators.filter((c) => {
        const h = (c.handle || '').toLowerCase();
        const d = (c.displayName || '').toLowerCase();
        return h.includes(qLower) || d.includes(qLower);
      });
      // When filtering locally, pagination semantics get fuzzy; keep nextCursor only if unfiltered length hit the page size
      if (creators.length < limit) nextCursor = null;
    }

    // 4) Optional enrichment: ratings
    let enriched: any[] = creators;
    if (include === 'rating' && creators.length) {
      const summaries = await Promise.all(
        creators.map((c) =>
          getRatingSummary(c.id).catch(() => ({ count: 0, sum: 0, avg: 0 }))
        )
      );
      enriched = creators.map((c, i) => ({ ...c, rating: summaries[i] }));
    }

    return NextResponse.json(
      { ok: true, creators: enriched, nextCursor },
      withCors({
        headers: {
          'Cache-Control': 's-maxage=15, stale-while-revalidate=60',
        },
      })
    );
  } catch (err) {
    console.error('listCreatorsPage failed:', err);
    return NextResponse.json(
      { ok: true, creators: [] as any[], nextCursor: null },
      withCors({
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      })
    );
  }
}
