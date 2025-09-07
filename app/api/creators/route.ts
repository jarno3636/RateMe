// app/api/creators/route.ts
import { NextResponse } from 'next/server';
import { listCreators } from '@/lib/kv';

export const runtime = 'edge';

export async function GET() {
  const rows = await listCreators(24);
  return NextResponse.json({ creators: rows });
}
