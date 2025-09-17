// app/api/upload/route.ts
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs" // blob requires node runtime

// Accepted types and size caps
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"])
const MAX_IMAGE_BYTES = 1 * 1024 * 1024   // 1 MB
const MAX_VIDEO_BYTES = 2 * 1024 * 1024   // 2 MB

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    const type = file.type
    const size = file.size

    const isImage = IMAGE_TYPES.has(type)
    const isVideo = VIDEO_TYPES.has(type)

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 })
    }

    if (isImage && size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image exceeds 1 MB" }, { status: 413 })
    }
    if (isVideo && size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Video exceeds 2 MB" }, { status: 413 })
    }

    // Filename: timestamped + original ext
    const ext = file.name.includes(".") ? file.name.split(".").pop() : (isImage ? "png" : "mp4")
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Upload to Vercel Blob (public)
    const arrayBuf = await file.arrayBuffer()
    const { url } = await put(key, new Uint8Array(arrayBuf), {
      access: "public",
      contentType: type,
      addRandomSuffix: false,
    })

    return NextResponse.json({ url, type, size })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
