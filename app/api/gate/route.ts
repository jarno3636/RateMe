// app/api/gate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, getContract } from 'viem'
import { base } from 'viem/chains'
import SUBSCRIPTION_ABI from '@/lib/abi/Subscriptions.json' // export from hardhat/foundry build
const SUBS_ADDR = process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDR as `0x${string}`

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const user = url.searchParams.get('user') as `0x${string}` | null
    const creator = url.searchParams.get('creator') as `0x${string}` | null
    const objectKey = url.searchParams.get('key') // e.g. s3 path
    if (!user || !creator || !objectKey) {
      return NextResponse.json({ ok: false, error: 'missing params' }, { status: 400 })
    }

    const client = createPublicClient({ chain: base, transport: http() })
    const contract = getContract({ address: SUBS_ADDR, abi: SUBSCRIPTION_ABI, client })
    const active = await contract.read.isActive([user, creator]) as boolean
    if (!active) return NextResponse.json({ ok: false, error: 'not subscribed' }, { status: 403 })

    // TODO: generate a short-lived signed URL for your storage (S3/R2)
    const signedUrl = await getSignedUrlFromYourStore(objectKey, /* ttl */ 120) // implement
    return NextResponse.json({ ok: true, url: signedUrl }, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
