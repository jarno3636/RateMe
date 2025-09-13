// app/api/creator/save/route.ts
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAddress, getAddress } from 'viem'
import {
  getCreator,
  getCreatorByHandle,
  ensureCreator,
  updateCreatorKV,
  type Creator,
} from '@/lib/kv'

export const runtime = 'nodejs'          // keep Node so revalidatePath is available
export const dynamic = 'force-dynamic'

/* ------------------------------- CORS ------------------------------- */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
} as const

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

/* ------------------------------ helpers ----------------------------- */
const MAX_BIO_WORDS = 250
const isNumeric = (s: string) => /^\d+$/.test(s)
const lc = (s: string) => String(s || '').trim().toLowerCase()
const normalizeHandle = (s?: string) =>
  s ? s.trim().replace(/^@+/, '').toLowerCase() : undefined

function isLikelyUrl(s?: string | null) {
  if (!s) return false
  const v = String(s).trim()
  if (v.startsWith('ipfs://')) return true
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Resolve a Creator by id or handle; migrates legacy if necessary. */
async function resolveCreator(idOrHandle: string): Promise<Creator | null> {
  const key = lc(idOrHandle)
  if (!key) return null

  // try by id (and ensure/migrate)
  const fromId =
    (await ensureCreator(key)) ||
    (isNumeric(key) ? null : null)

  if (fromId) return fromId

  // try by handle mapping
  const byHandle =
    (await getCreatorByHandle(key)) ||
    (await getCreatorByHandle(normalizeHandle(key) || key))

  if (byHandle) return byHandle

  // final attempt: some legacy stored handle directly as id
  const legacy = await getCreator(key).catch(() => null)
  return legacy
}

/* -------------------------------- POST ------------------------------ */
/**
 * POST /api/creator/save
 * Body: {
 *   id: string | handle (required),
 *   bio?: string,
 *   avatarUrl?: string,
 *   displayName?: string,
 *   address?: `0x...` | null,
 *   fid?: number,
 *   handle?: string   // optional handle change
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))

    const rawId = lc(body?.id)
    if (!rawId) {
      return NextResponse.json(
        { ok: false, error: 'Missing id' },
        { status: 400, headers: corsHeaders }
      )
    }

    const creator = await resolveCreator(rawId)
    if (!creator) {
      return NextResponse.json(
        { ok: false, error: 'Creator not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // ---- validate patchable fields
    const patch: {
      handle?: string
      bio?: string
      avatarUrl?: string
      displayName?: string
      address?: `0x${string}` | null
      fid?: number
    } = {}

    // bio
    if (typeof body?.bio === 'string') {
      const words = body.bio.trim().split(/\s+/).filter(Boolean)
      if (words.length > MAX_BIO_WORDS) {
        return NextResponse.json(
          { ok: false, error: `Bio must be ${MAX_BIO_WORDS} words or less` },
          { status: 400, headers: corsHeaders }
        )
      }
      patch.bio = body.bio
    }

    // avatar
    if (typeof body?.avatarUrl === 'string') {
      const v = body.avatarUrl.trim()
      if (v && v.length > 1024) {
        return NextResponse.json(
          { ok: false, error: 'Avatar URL too long' },
          { status: 400, headers: corsHeaders }
        )
      }
      if (v && !isLikelyUrl(v)) {
        return NextResponse.json(
          { ok: false, error: 'Avatar URL must be http(s) or ipfs://' },
          { status: 400, headers: corsHeaders }
        )
      }
      patch.avatarUrl = v
    }

    // displayName
    if (typeof body?.displayName === 'string') {
      const d = body.displayName.trim()
      if (d.length > 120) {
        return NextResponse.json(
          { ok: false, error: 'Display name too long' },
          { status: 400, headers: corsHeaders }
        )
      }
      patch.displayName = d
    }

    // address (normalize to checksum; allow null to clear)
    if (body?.address === null) {
      patch.address = null
    } else if (typeof body?.address === 'string' && body.address.trim()) {
      const a = body.address.trim()
      if (!isAddress(a)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid address' },
          { status: 400, headers: corsHeaders }
        )
      }
      patch.address = getAddress(a) as `0x${string}`
    }

    // fid
    if (typeof body?.fid === 'number') {
      patch.fid = Number.isFinite(body.fid) ? body.fid : undefined
    }

    // optional handle change
    if (typeof body?.handle === 'string' && body.handle.trim()) {
      patch.handle = normalizeHandle(body.handle)
    }

    if (
      patch.bio === undefined &&
      patch.avatarUrl === undefined &&
      patch.displayName === undefined &&
      patch.address === undefined &&
      patch.fid === undefined &&
      patch.handle === undefined
    ) {
      return NextResponse.json(
        { ok: false, error: 'Nothing to update' },
        { status: 400, headers: corsHeaders }
      )
    }

    // ---- write via KV helper so indexes stay consistent
    const updated = await updateCreatorKV({
      id: creator.id, // always use canonical id
      ...patch,
    })

    // Revalidate both /creator/:id and /creator/:handle
    try {
      revalidatePath(`/creator/${updated.id}`)
      if (updated.handle) revalidatePath(`/creator/${updated.handle}`)
    } catch {
      /* noop if not available */
    }

    return NextResponse.json(
      { ok: true, creator: updated },
      { headers: corsHeaders }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Update failed' },
      { status: 500, headers: corsHeaders }
    )
  }
}
