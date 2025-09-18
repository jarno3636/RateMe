// /app/api/upload/route.ts
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import crypto from "crypto"

export const runtime = "nodejs"

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"])
const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // 1MB
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 // 2MB

const EXT_FROM_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
}

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return bad(500, "Storage is not configured (missing BLOB_READ_WRITE_TOKEN).")
    }

    const form = await req.formData()
    const file = (form as any).get?.("file") as File | null
    if (!file) return bad(400, "No file provided")

    const type = (file as any).type as string
    const size = Number((file as any).size ?? 0)
    const isImage = IMAGE_TYPES.has(type)
    const isVideo = VIDEO_TYPES.has(type)

    if (!isImage && !isVideo) return bad(415, "Unsupported file type. Allowed: PNG, JPG, WEBP, GIF, MP4, WEBM.")
    if (isImage && size > MAX_IMAGE_BYTES) return bad(413, "Image exceeds 1 MB")
    if (isVideo && size > MAX_VIDEO_BYTES) return bad(413, "Video exceeds 2 MB")

    const arrayBuf: ArrayBuffer = await (file as any).arrayBuffer()
    const buf = Buffer.from(arrayBuf)

    if (isImage && buf.byteLength > MAX_IMAGE_BYTES) return bad(413, "Image exceeds 1 MB")
    if (isVideo && buf.byteLength > MAX_VIDEO_BYTES) return bad(413, "Video exceeds 2 MB")

    const ext = EXT_FROM_MIME[type] || "bin"
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16)
    const stamp = Date.now()
    const kind = isImage ? "images" : "videos"
    const key = `uploads/${kind}/${stamp}-${hash}.${ext}`

    const { url } = await put(key, buf, {
      access: "public",
      contentType: type,
      addRandomSuffix: false, // hash already in name
      // NOTE: omit cacheControl; your installed @vercel/blob doesn't support it
    })

    return NextResponse.json({ url, type, size: buf.byteLength, kind: isImage ? "image" : "video" })
  } catch (e: any) {
    console.error("[/api/upload] error:", e)
    return bad(500, e?.message || "Upload failed")
  }
}
