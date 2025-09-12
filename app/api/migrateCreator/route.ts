import { NextResponse } from 'next/server'
import { migrateCreator } from '@/lib/kv'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const idOrHandle: string | undefined =
      body?.id ?? body?.handle ?? body?.key ?? body?.creator

    if (!idOrHandle || typeof idOrHandle !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Provide "id" or "handle" in the JSON body.' },
        { status: 400 }
      )
    }

    const result = await migrateCreator(idOrHandle)

    return NextResponse.json({
      ok: true,
      migrated: result.migrated,
      creator: result.creator,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Migration failed' },
      { status: 500 }
    )
  }
}
