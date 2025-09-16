// /app/api/upload-avatar/route.ts
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs"

const MAX_BYTES = 1_000_000 // 1MB

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    // Vercel build TS quirk: cast to any to access .get safely
    const file = (form as any).get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })
    if (!file.type?.startsWith?.("image/")) {
      return NextResponse.json({ error: "Only image files allowed" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be ≤ 1MB" }, { status: 400 })
    }

    const ext = file.name?.split(".").pop() || "jpg"
    const objectName = `avatars/avatar_${Date.now()}.${ext}`

    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    const blob = await put(objectName, buffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    })

    return NextResponse.json({ url: blob.url })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
  }
}
