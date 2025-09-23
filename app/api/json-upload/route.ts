// /app/api/json-upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID, createHash } from "crypto";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return bad(500, "Storage not configured (missing BLOB_READ_WRITE_TOKEN).");
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return bad(400, "Invalid JSON");

    // Tiny schema guard
    const url = String((body as any).url ?? "");
    if (!url || !/^https?:\/\//i.test(url)) {
      return bad(400, "Field 'url' must be http(s)");
    }
    const description =
      (typeof (body as any).description === "string" ? (body as any).description : "").slice(0, 280);
    const coverUrlRaw = String((body as any).coverUrl ?? "");
    const coverUrl = coverUrlRaw && /^https?:\/\//i.test(coverUrlRaw) ? coverUrlRaw : undefined;

    const payload = {
      kind: "onlystars.linkUnlock@v1",
      url,
      ...(description ? { description } : {}),
      ...(coverUrl ? { coverUrl } : {}),
    };

    const bytes = Buffer.from(JSON.stringify(payload));
    const sha = createHash("sha256").update(bytes).digest("hex").slice(0, 40);
    const key = `metadata/link-unlock/${sha}-${randomUUID()}.json`;

    const blob = await put(key, bytes, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return json(200, { ok: true, url: blob.url, key, size: bytes.byteLength });
  } catch (e: any) {
    console.error("[/api/json-upload] error:", e);
    return bad(500, e?.message || "Upload failed");
  }
}

export async function GET() {
  return bad(405, "Method not allowed");
}
