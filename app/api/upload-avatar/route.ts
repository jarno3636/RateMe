// /app/api/upload-avatar/route.ts
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs"

const MAX_BYTES = 1_000_000 // 1MB
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])
const EXT_FROM_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return bad(500, "Storage not configured (missing BLOB_READ_WRITE_TOKEN).")
    }

    const form = await req.formData()
    const file = (form as any).get("file") as File | null
    if (!file) return bad(400, "No file")
    const type = (file as any).type as string
    const size = Number((file as any).size ?? 0)

    if (!IMAGE_TYPES.has(type)) return bad(400, "Only image files allowed")
    if (size > MAX_BYTES) return bad(400, "Image must be ≤ 1MB")

    const ext = EXT_FROM_MIME[type] || "jpg"
    const key = `avatars/avatar_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuf = await (file as any).arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    const blob = await put(key, buffer, {
      access: "public",
      contentType: type,
      addRandomSuffix: false,
      cacheControl: "public, max-age=31536000, immutable",
    })

    return NextResponse.json({ url: blob.url })
  } catch (err: any) {
    console.error("[/api/upload-avatar] error:", err)
    return bad(500, err?.message || "Upload failed")
  }
}
