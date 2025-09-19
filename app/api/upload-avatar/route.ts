// /app/api/upload-avatar/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createHash, randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_BYTES = 1_000_000; // 1MB cap
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const EXT_FROM_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function bad(status: number, error: string) {
  return new NextResponse(JSON.stringify({ error }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Very lightweight magic-byte checks (best-effort; not bulletproof)
function looksLike(type: string, buf: Buffer) {
  if (type === "image/png") {
    // 89 50 4E 47 0D 0A 1A 0A
    return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (type === "image/jpeg" || type === "image/jpg") {
    // FF D8 ... (check start)
    return buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
  }
  if (type === "image/gif") {
    // GIF87a or GIF89a
    return buf.length > 6 && buf.slice(0, 6).toString("ascii").startsWith("GIF8");
  }
  if (type === "image/webp") {
    // "RIFF" .... "WEBP"
    return (
      buf.length > 12 &&
      buf.slice(0, 4).toString("ascii") === "RIFF" &&
      buf.slice(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (type === "image/avif") {
    // ISO BMFF with "ftyp"
    return buf.length > 12 && buf.slice(4, 8).toString("ascii") === "ftyp";
  }
  return false;
}

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return bad(500, "Storage not configured (missing BLOB_READ_WRITE_TOKEN).");
    }

    // Enforce multipart/form-data
    const ctype = req.headers.get("content-type") || "";
    if (!ctype.toLowerCase().includes("multipart/form-data")) {
      return bad(415, "Expected multipart/form-data");
    }

    const form = (await req.formData()) as unknown as { get?: (k: string) => unknown };
    const file = (form.get ? form.get("file") : null) as File | null;
    if (!file) return bad(400, "No file");

    const type = (file as any).type as string | undefined;
    const size = Number((file as any).size ?? 0);
    if (!type || !IMAGE_TYPES.has(type)) return bad(400, "Only PNG, JPEG, WEBP, GIF, or AVIF allowed");
    if (!Number.isFinite(size) || size <= 0) return bad(400, "Empty upload");
    if (size > MAX_BYTES) return bad(400, "Image must be ≤ 1MB");

    // Read bytes
    const arrayBuf = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Best-effort sniff to reduce spoofed content-type
    if (!looksLike(type, buffer)) {
      return bad(400, "File content does not match declared image type");
    }

    // Deterministic path: avatars/<sha256>-<uuid>.<ext>
    const sha = createHash("sha256").update(buffer).digest("hex").slice(0, 40);
    const ext = EXT_FROM_MIME[type] || "jpg";
    const key = `avatars/${sha}-${randomUUID()}.${ext}`;

    const blob = await put(key, buffer, {
      access: "public",
      contentType: type,
      addRandomSuffix: false,
    });

    return new NextResponse(
      JSON.stringify({ url: blob.url, key, size, type }),
      { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }
    );
  } catch (err: any) {
    console.error("[/api/upload-avatar] error:", err);
    return bad(500, err?.message || "Upload failed");
  }
}

export async function GET() {
  return bad(405, "Method not allowed");
}
