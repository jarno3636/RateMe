// app/api/upload/route.ts
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs"

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"])
const MAX_IMAGE_BYTES = 1 * 1024 * 1024
const MAX_VIDEO_BYTES = 2 * 1024 * 1024

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    // Cast to any to satisfy TS when DOM lib isn't present on server build
    const file = (form as any).get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    const type = (file as any).type as string
    const size = (file as any).size as number

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

    const name: string = (file as any).name || ""
    const ext = name.includes(".") ? name.split(".").pop() : (isImage ? "png" : "mp4")
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuf = await (file as any).arrayBuffer()
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
