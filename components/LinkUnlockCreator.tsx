// /components/LinkUnlockCreator.tsx
"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import * as ADDR from "@/lib/addresses";
import { useCreatePost as useCreatePostOnchain } from "@/hooks/useCreatorHub";
import type { LinkUnlockV1 } from "@/types/linkUnlock";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB (cover)

function PriceInput({
  value, onChange, disabled, "aria-label": ariaLabel = "Price in USDC",
}: { value: string; onChange: (s: string) => void; disabled?: boolean; "aria-label"?: string }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="^\\d+(\\.\\d{0,2})?$"
      placeholder="0.00"
      value={value}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, "");
        const [i, f] = raw.split(".");
        const intPart = (i ?? "").slice(0, 12);
        const fracPart = (f ?? "").slice(0, 2);
        onChange(fracPart ? `${intPart}.${fracPart}` : intPart);
      }}
      onBlur={(e) => {
        const n = Number.parseFloat(e.currentTarget.value || "0");
        onChange(Number.isFinite(n) ? n.toFixed(2) : "0.00");
      }}
      disabled={disabled}
      className="w-28 rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
      aria-label={ariaLabel}
    />
  );
}

function looksLikeHttpUrl(s: string) {
  try { const u = new URL(s); return u.protocol === "https:" || u.protocol === "http:"; }
  catch { return false; }
}

export default function LinkUnlockCreator() {
  const [externalUrl, setExternalUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("0.00");
  const [subGate, setSubGate] = useState(false);
  const [busy, setBusy] = useState(false); // creating state
  const [uploadingCover, setUploadingCover] = useState(false); // cover upload state

  const { createPost } = useCreatePostOnchain();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canCreate = useMemo(
    () => !!ADDR.USDC && !!ADDR.HUB && looksLikeHttpUrl(externalUrl) && Number.isFinite(Number(price)),
    [externalUrl, price]
  );

  const uploadCover = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Cover must be an image");
    if (file.size > MAX_IMAGE_BYTES) return toast.error("Cover image exceeds 4 MB");
    try {
      setUploadingCover(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      setCoverUrl(String(json.url));
      toast.success("Cover uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  }, []);

  const onCreate = useCallback(async () => {
    try {
      if (!ADDR.USDC) throw new Error("Missing USDC address");
      if (!ADDR.HUB) throw new Error("Missing HUB address");
      if (!looksLikeHttpUrl(externalUrl)) return toast.error("Enter a valid http(s) URL");

      setBusy(true);

      // 1) Upload JSON metadata
      const meta: LinkUnlockV1 = {
        kind: "onlystars.linkUnlock@v1",
        url: externalUrl.trim(),
        ...(desc.trim() ? { description: desc.trim() } : {}),
        ...(coverUrl.trim() ? { coverUrl: coverUrl.trim() } : {}),
      };

      const metaRes = await fetch("/api/json-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(meta),
      });
      const metaJson = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaJson?.error || "JSON upload failed");
      const jsonUri: string = String(metaJson.url);

      // 2) Create post with JSON URI
      const priceFloat = Number.parseFloat(price || "0");
      const priceUnits = BigInt(Math.round((Number.isFinite(priceFloat) ? priceFloat : 0) * 1e6));
      await toast.promise(
        createPost(ADDR.USDC, priceUnits, subGate, jsonUri),
        {
          loading: "Creating…",
          success: "Unlock created",
          error: (e: any) => e?.shortMessage || e?.message || "Create failed",
        }
      );

      setExternalUrl(""); setCoverUrl(""); setDesc(""); setPrice("0.00"); setSubGate(false);
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }, [externalUrl, coverUrl, desc, price, subGate, createPost]);

  return (
    <section className="card space-y-4 w-full max-w-2xl mx-auto px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-semibold">Sell access to a link</div>
        <span className="text-xs rounded-full border border-pink-500/40 px-2 py-0.5 text-pink-200">New</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-sm opacity-70">External URL</div>
          <input
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
            placeholder="https://drive.google.com/..., https://mydomain.com/album"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm opacity-70">Price (USDC)</div>
          <div className="flex items-center gap-2">
            <PriceInput value={price} onChange={setPrice} />
            <span className="text-xs opacity-60">0 = free</span>
          </div>
        </label>

        <label className="md:col-span-2 block">
          <div className="mb-1 text-sm opacity-70">Description (optional)</div>
          <input
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
            placeholder="e.g. 500+ high-res photos from my 2024 shoots"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={280}
          />
        </label>

        {/* Cover row – fixed button width + truncating URL prevents shifts */}
        <div className="md:col-span-2 space-y-2">
          <div className="text-sm opacity-70">Cover (optional, ≤ 4 MB)</div>
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="btn w-36 justify-center"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCover}
            >
              {uploadingCover ? "Uploading…" : "Upload cover"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.currentTarget.files?.[0];
                if (f) await uploadCover(f);
                e.currentTarget.value = "";
              }}
            />
            {uploadingCover && (
              <span className="text-[11px] rounded-full border border-white/15 px-2 py-0.5 opacity-80 shrink-0">
                working…
              </span>
            )}
            {coverUrl && (
              <span className="text-xs opacity-70 truncate min-w-0">{coverUrl}</span>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={subGate} onChange={(e) => setSubGate(e.target.checked)} />
          <span className="text-sm">Gate by active subscription</span>
        </label>
      </div>

      <div className="rounded-xl border border-dashed border-white/15 p-3 text-xs opacity-70">
        We store a small JSON file with <b>url</b>, <b>description</b>, and <b>coverUrl</b>. The post’s on-chain <code>uri</code> points to that JSON.
      </div>

      {/* Actions – fixed widths keep row aligned while labels change */}
      <div className="flex gap-2">
        <button className="btn w-44 justify-center" onClick={onCreate} disabled={busy || !canCreate || uploadingCover}>
          {busy ? "Creating…" : "Create link unlock"}
        </button>
        <button
          className="btn-secondary w-24 justify-center"
          onClick={() => { setExternalUrl(""); setPrice("0.00"); setSubGate(false); setDesc(""); setCoverUrl(""); }}
          disabled={busy || uploadingCover}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
