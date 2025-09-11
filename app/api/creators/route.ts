// app/api/creators/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listCreatorsPage, getRatingSummary, type Creator } from '@/lib/kv';
import { listProfilesFlat } from '@/lib/profileRegistry/reads';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* --------------------------------- utils --------------------------------- */
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
    .transform(v => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(1).max(50).optional()),
  cursor: z
    .string()
    .optional()
    .transform(v => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(0).optional()),
  include: z.enum(['rating']).optional(),
});

/**
 * Map on-chain profile rows to the *KV Creator* shape the UI expects.
 * Only include fields defined by `Creator` to keep types happy.
 */
function mapOnchainToCreator(item: {
  id: bigint;
  owner: `0x${string}`;
  handle: string;
  displayName: string;
  avatarURI: string;
  bio: string;
}) : Creator {
  return {
    id: String(item.id),
    handle: item.handle || '',
    displayName: item.displayName || '',
    avatarUrl: item.avatarURI || '',
    bio: item.bio || '',
    address: item.owner, // <- required by Creator
  };
}

/* -------------------------------- handlers -------------------------------- */
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
    });

    const limit = parsed.success ? parsed.data.limit ?? 12 : 12;
    const cursor = parsed.success ? parsed.data.cursor ?? 0 : 0;
    const include = parsed.success ? parsed.data.include : undefined;

    // 1) Primary: KV-backed discover
    let { creators, nextCursor } = await listCreatorsPage({ limit, cursor });

    // 2) Fallback: populate from on-chain registry if KV is empty
    if (!creators?.length) {
      const pageSize = BigInt(Math.max(1, Math.min(50, limit)));
      const chain = await listProfilesFlat(0n, pageSize);

      const mapped: Creator[] = chain.items.map(item =>
        mapOnchainToCreator({
          id: item.id,
          owner: item.owner,
          handle: item.handle,
          displayName: item.displayName,
          avatarURI: item.avatarURI,
          bio: item.bio,
        })
      );

      creators = mapped; // now matches Creator[]
      nextCursor = chain.nextCursor ? Number(chain.nextCursor) : null;
    }

    // 3) Optional enrichment: ratings
    let enriched: Array<Creator & { rating?: { count: number; sum: number; avg: number } }> = creators;
    if (include === 'rating' && creators.length) {
      const summaries = await Promise.all(
        creators.map(c =>
          getRatingSummary(c.id).catch(() => ({ count: 0, sum: 0, avg: 0 }))
        )
      );
      enriched = creators.map((c, i) => ({ ...c, rating: summaries[i] }));
    }

    return NextResponse.json(
      { creators: enriched, nextCursor },
      withCors({
        headers: {
          'Cache-Control': 's-maxage=15, stale-while-revalidate=60',
        },
      })
    );
  } catch (err) {
    console.error('GET /api/creators failed:', err);
    return NextResponse.json(
      { creators: [] as Creator[], nextCursor: null },
      withCors({
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      })
    );
  }
}
