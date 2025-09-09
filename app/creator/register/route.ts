import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { handle } = await req.json();
    if (!handle || typeof handle !== 'string') {
      return NextResponse.json({ error: 'Missing handle' }, { status: 400 });
    }

    // TODO: hydrate from Neynar & store in KV/DB
    // const profile = await fetchNeynar(handle)
    // await kv.set(`creator:${handle}`, profile)

    return NextResponse.json({
      ok: true,
      creator: { id: handle.toLowerCase() },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
