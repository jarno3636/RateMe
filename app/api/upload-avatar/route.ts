// /app/api/upload-avatar/route.ts
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs" // (Blob works in edge too; node is fine here)

const MAX_BYTES = 1_000_000 // 1MB

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 })
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files allowed" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be ≤ 1MB" }, { status: 400 })
    }

    // Sensible filename (no PII): avatar_<timestamp>.<ext>
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg"
    const objectName = `avatars/avatar_${Date.now()}.${ext}`

    const buf = Buffer.from(await file.arrayBuffer())
    const blob = await put(objectName, buf, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true, // avoid collisions
    })

    // blob.url is the public, immutable URL; store on-chain as avatarURI
    return NextResponse.json({ url: blob.url })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
  }
}
