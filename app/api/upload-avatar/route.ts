// /app/api/upload-avatar/route.ts
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs"

const MAX_BYTES = 1_000_000 // 1MB

export async function POST(req: Request) {
  try {
    // Some Vercel/Node TS combos resolve a minimal FormData type without `.get`.
    // Cast to any to avoid the "Property 'get' does not exist" error during build.
    const form: any = await req.formData()
    const file: any = form?.get?.("file")

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 })
    }
    // Basic shape checks without relying on DOM lib types
    if (typeof file.type !== "string" || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files allowed" }, { status: 400 })
    }
    if (typeof file.size !== "number" || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be ≤ 1MB" }, { status: 400 })
    }

    // Sensible filename (no PII): avatar_<timestamp>.<ext>
    const name: string = typeof file.name === "string" ? file.name : "avatar.jpg"
    const ext = name.includes(".") ? name.split(".").pop() : "jpg"
    const objectName = `avatars/avatar_${Date.now()}.${ext}`

    // You can pass the web File directly to put()
    const blob = await put(objectName, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
      // token: process.env.BLOB_READ_WRITE_TOKEN, // (only needed if running off-Vercel or locally)
    })

    return NextResponse.json({ url: blob.url })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
  }
}
