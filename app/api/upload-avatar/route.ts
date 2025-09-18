// /app/api/upload-avatar/route.ts
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import crypto from "crypto"

export const runtime = "nodejs"

const MAX_BYTES = 1_000_000 // 1MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
])

function extFor(mime: string) {
  if (mime === "image/png") return "png"
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg"
  if (mime === "image/webp") return "webp"
  if (mime === "image/gif") return "gif"
  if (mime === "image/avif") return "avif"
  return "bin"
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = (form as any).get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }
    if (!file.type || !ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be ≤ 1MB" }, { status: 400 })
    }

    // Read the file
    const arrayBuf = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuf)

    // Optional: auto-resize to 512x512 if 'sharp' is available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharp = require("sharp") as typeof import("sharp")
      buffer = await sharp(buffer).resize(512, 512, { fit: "cover" }).toBuffer()
    } catch {
      // sharp not installed — skip resize (still safe)
    }

    // Hash for deterministic, non-guessable name
    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 32)
    const ext = extFor(file.type)
    const objectName = `avatars/${hash}.${ext}`

    const blob = await put(objectName, buffer, {
      access: "public",
      contentType: file.type,
      // Premium perf: long-lived CDN cache; URL is content-addressed by hash
      cacheControlMaxAge: 60 * 60 * 24 * 365, // 1 year
      contentDisposition: "inline",
      addRandomSuffix: false,
    })

    return NextResponse.json({ url: blob.url, bytes: buffer.byteLength, mime: file.type })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
  }
}
