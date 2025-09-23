// /app/api/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createHash, randomUUID } from "crypto";

export const runtime = "nodejs";

/* ── Config ──────────────────────────────────────────────────────────────── */

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  // "image/avif", // enable if you want AVIF (sniff supported below)
]);

const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

// ⬆️ bumped limits
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 2 MB
const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // 5 MB

const EXT_FROM_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  // "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

/* ── Utils ───────────────────────────────────────────────────────────────── */

function json(status: number, data: unknown) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
const bad = (status: number, error: string) => json(status, { error });

function isImageType(t: string) {
  return IMAGE_TYPES.has(t);
}
function isVideoType(t: string) {
  return VIDEO_TYPES.has(t);
}

// Very lightweight magic-byte checks (best-effort; not a full codec parser)
function looksLike(type: string, buf: Buffer) {
  if (type === "image/png") {
    // 89 50 4E 47
    return buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (type === "image/jpeg" || type === "image/jpg") {
    // FF D8
    return buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
  }
  if (type === "image/gif") {
    // GIF87a / GIF89a
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
    // ISO BMFF: check "ftyp"
    return buf.length > 12 && buf.slice(4, 8).toString("ascii") === "ftyp";
  }
  if (type === "video/webm") {
    // WebM is Matroska in EBML; first bytes: 1A 45 DF A3
    return buf.length > 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  }
  if (type === "video/mp4") {
    // MP4 (ISO BMFF): "ftyp" at offset 4
    return buf.length > 12 && buf.slice(4, 8).toString("ascii") === "ftyp";
  }
  return false;
}

/* ── Route ───────────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return bad(500, "Storage not configured (missing BLOB_READ_WRITE_TOKEN).");
    }

    // Enforce multipart form uploads
    const ctype = (req.headers.get("content-type") || "").toLowerCase();
    if (!ctype.includes("multipart/form-data")) {
      return bad(415, "Expected multipart/form-data");
    }

    // Cast to a shape with optional .get to satisfy TS on Vercel’s build
    const form = (await req.formData()) as unknown as { get?: (k: string) => unknown };
    const file = (form.get ? (form.get("file") as File | null) : null);
    if (!file) return bad(400, "No file provided");

    const type = (file as any).type as string | undefined;
    const size = Number((file as any).size ?? 0);
    if (!type) return bad(400, "Missing MIME type");

    const isImage = isImageType(type);
    const isVideo = isVideoType(type);

    if (!isImage && !isVideo) {
      return bad(415, "Unsupported type. Allowed: PNG, JPEG, WEBP, GIF, (optional AVIF), MP4, WEBM.");
    }
    if (!Number.isFinite(size) || size <= 0) return bad(400, "Empty upload");

    const sizeCap = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (size > sizeCap) {
      return bad(
        413,
        `${isImage ? "Image" : "Video"} exceeds ${(sizeCap / 1024 / 1024).toFixed(0)} MB`
      );
    }

    // Read bytes and double-check against cap (defense-in-depth)
    // @ts-ignore - Next runtime File supports arrayBuffer()
    const arrayBuf: ArrayBuffer = await (file as any).arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.byteLength > sizeCap) {
      return bad(
        413,
        `${isImage ? "Image" : "Video"} exceeds ${(sizeCap / 1024 / 1024).toFixed(0)} MB`
      );
    }

    // Best-effort content sniffing to reduce spoofed content-type uploads
    if (!looksLike(type, buf)) {
      return bad(400, "File content does not match declared MIME type");
    }

    // Deterministic-ish path: sha256 prefix + uuid jitter to reduce collision risk
    const sha = createHash("sha256").update(buf).digest("hex").slice(0, 40);
    const ext = EXT_FROM_MIME[type] || "bin";
    const kind = isImage ? "images" : "videos";
    const key = `uploads/${kind}/${sha}-${randomUUID()}.${ext}`;

    const blob = await put(key, buf, {
      access: "public",
      contentType: type,
      addRandomSuffix: false, // sha + uuid already ensures uniqueness
      // cacheControl not supported in some @vercel/blob versions – omit safely
    });

    return json(200, {
      ok: true,
      url: blob.url,
      key,
      type,
      size: buf.byteLength,
      kind: isImage ? "image" : "video",
    });
  } catch (e: any) {
    console.error("[/api/upload] error:", e);
    return bad(500, e?.message || "Upload failed");
  }
}

// Optional: keep this route focused on POST
export async function GET() {
  return bad(405, "Method not allowed");
}
