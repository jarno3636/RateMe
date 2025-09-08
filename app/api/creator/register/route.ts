// app/api/creator/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createCreatorUnique } from '@/lib/kv'
import { fetchNeynarUserByHandle, fetchNeynarUserByFid } from '@/lib/neynar'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    // Normalize handle: strip @, lowercase for id
    const handleRaw = String(body?.handle ?? '').trim().replace(/^@/, '')
    if (!handleRaw) {
      return NextResponse.json({ error: 'Missing handle' }, { status: 400 })
    }

    const id = handleRaw.toLowerCase()
    const address = (body?.address ?? null) as `0x${string}` | null
    const fidInput = typeof body?.fid === 'number' ? (body.fid as number) : undefined

    // Try Neynar enrichment (don’t fail the whole request if it errors)
    let displayName: string | undefined
    let avatarUrl: string | undefined
    let bio: string | undefined
    let fid: number | undefined = fidInput

    try {
      if (fidInput) {
        const u = await fetchNeynarUserByFid(fidInput)
        if (u) {
          fid = u.fid
          displayName = u.display_name || undefined
          avatarUrl = u.pfp_url || undefined
          bio = u.bio?.text || undefined
        }
      } else {
        const u = await fetchNeynarUserByHandle(handleRaw)
        if (u) {
          fid = u.fid
          displayName = u.display_name || undefined
          avatarUrl = u.pfp_url || undefined
          bio = u.bio?.text || undefined
        }
      }
    } catch {
      // swallow enrichment errors; we still create the record
    }

    // Create atomically; KV setnx inside createCreatorUnique guarantees uniqueness.
    const creator = await createCreatorUnique({
      id,
      handle: handleRaw,         // keep original case for display
      address,
      fid,
      displayName: displayName ?? handleRaw,
      avatarUrl,
      bio,
      createdAt: Date.now(),
    })

    return NextResponse.json({ ok: true, creator }, { status: 201 })
  } catch (e: any) {
    const msg = String(e?.message || e)

    // Map our KV uniqueness failure to 409
    if (msg.includes('Handle is taken') || msg.includes('already exists')) {
      return NextResponse.json({ error: 'Handle already registered' }, { status: 409 })
    }

    console.error('creator/register failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
