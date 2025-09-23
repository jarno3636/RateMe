// /components/CreatorContentManager.tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import {
  useCreatorPostIds,
  useCreatorPlanIds,
  usePost,
  usePlan,
  useCreatePost as useCreatePostOnchain,
  useCreatePlan as useCreatePlanOnchain,
} from "@/hooks/useCreatorHub";
import { useUpdatePost, useUpdatePlan } from "@/hooks/useCreatorHubExtras";
import * as ADDR from "@/lib/addresses";

// NEW: link-unlock creator (JSON metadata)
import LinkUnlockCreator from "@/components/LinkUnlockCreator";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;  // 4 MB
const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // 15 MB

const isImg = (u: string) =>
  !!u && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(new URL(u, "http://x").pathname);
const isVideo = (u: string) =>
  !!u && /\.(mp4|webm|ogg)$/i.test(new URL(u, "http://x").pathname);
const fmt6 = (v: bigint) => (Number(v) / 1e6).toFixed(2);
const basescanTx = (hash: `0x${string}`) => `https://basescan.org/tx/${hash}`;

/* ------------------------------- Inputs ------------------------------- */

function PriceInput({
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel = "Price in USDC",
}: {
  value: string;
  onChange: (s: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      // pattern is only enforced on form submit; it's fine to keep it
      pattern="^\d+(\.\d{0,2})?$"
      placeholder="0.00"
      value={value}
      onChange={(e) => {
        // Normalize: allow digits + dot, convert comma to dot for some mobile keyboards
        const normalized = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");

        // Split on the FIRST dot only; ignore additional dots
        const [i = "", f = ""] = normalized.split(".", 2);
        const hadDot = normalized.includes(".");

        // Limit lengths
        let intPart = i.replace(/^0+(?=\d)/, "").slice(0, 12); // trim leading zeros but keep a single 0
        if (intPart === "" && hadDot) intPart = "0"; // allow ".5" -> "0.5" UX
        const fracPart = f.slice(0, 2);

        // Preserve the trailing dot while user is still typing decimals
        const safe = hadDot ? `${intPart}.${fracPart}` : intPart;

        onChange(safe);
      }}
      onBlur={(e) => {
        const raw = e.currentTarget.value.replace(",", ".").replace(/[^\d.]/g, "");
        if (!raw) return onChange("0.00");

        // If user ends on a dot like "1.", treat as "1.00"
        const n = Number.parseFloat(raw.endsWith(".") ? raw.slice(0, -1) : raw);
        onChange(Number.isFinite(n) ? n.toFixed(2) : "0.00");
      }}
      disabled={disabled}
      className="w-28 rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
      aria-label={ariaLabel}
    />
  );
}

/* ---------------------------- Uploader UI ---------------------------- */

function DropUploader({
  label = "Choose file",
  tips = ["Image ≤ 4 MB", "Video ≤ 15 MB", "USDC, non-custodial"],
  onFile,
  busy,
}: {
  label?: string;
  tips?: string[];
  onFile: (f: File) => Promise<void> | void;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await onFile(f);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          "flex min-h-[104px] items-center justify-center rounded-xl border border-dashed p-3 transition",
          dragOver ? "border-pink-500/60 bg-pink-500/5" : "border-white/15 bg-black/20",
        ].join(" ")}
        role="group"
        aria-label="Upload area"
      >
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Choose media file"
          >
            {busy ? "Uploading…" : label}
          </button>
          <div className="text-xs opacity-70">or drag & drop here</div>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/*,video/*"
            onChange={async (e) => {
              const f = e.currentTarget.files?.[0];
              if (f) await onFile(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>
      {tips?.length ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {tips.map((t) => (
            <span key={t} className="rounded-full border border-white/10 px-2 py-0.5 opacity-70">
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------- Main Component -------------------------- */

export default function CreatorContentManager({ creator }: { creator: `0x${string}` }) {
  const { address } = useAccount();
  const isOwner = useMemo(
    () => !!address && address.toLowerCase() === (creator as string).toLowerCase(),
    [address, creator]
  );

  const {
    data: postIds,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useCreatorPostIds(creator);

  const {
    data: planIds,
    isLoading: plansLoading,
    refetch: refetchPlans,
  } = useCreatorPlanIds(creator);

  const posts = (postIds as bigint[] | undefined) ?? [];
  const plans = (planIds as bigint[] | undefined) ?? [];

  if (!isOwner) {
    return <div className="card border-red-500/40 text-red-200">Only the owner can manage content.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Posts */}
      <PostCreator onCreated={refetchPosts} />
      <PostList ids={posts} loading={postsLoading} onChanged={refetchPosts} />

      {/* Subscriptions */}
      <PlanCreator onCreated={refetchPlans} />

      {/* NEW: Link unlock composer (right under the subscription card) */}
      <LinkUnlockCreator />

      <PlanList ids={plans} loading={plansLoading} onChanged={refetchPlans} />
    </div>
  );
}

/* ------------------------------ Posts ------------------------------ */

function PostCreator({ onCreated }: { onCreated?: () => void }) {
  const [uri, setUri] = useState("");
  const [priceUsd, setPriceUsd] = useState("0.00");
  const [subGate, setSubGate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shareFarcaster, setShareFarcaster] = useState(false);

  const { createPost } = useCreatePostOnchain();

  const validateFile = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideoType = file.type.startsWith("video/");
    if (!isImage && !isVideoType) {
      toast.error("Pick an image or video");
      return false;
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      toast.error("Image exceeds 4 MB");
      return false;
    }
    if (isVideoType && file.size > MAX_VIDEO_BYTES) {
      toast.error("Video exceeds 15 MB");
      return false;
    }
    return true;
  };

  const onPick = useCallback(async (file: File) => {
    if (!file || !validateFile(file)) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      setUri(String(json.url));
      toast.success("Uploaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const onCreate = async () => {
    try {
      if (!ADDR.USDC) throw new Error("Missing USDC address (NEXT_PUBLIC_USDC).");
      if (!ADDR.HUB) throw new Error("Missing HUB address (NEXT_PUBLIC_CREATOR_HUB).");
      if (!uri) return toast.error("Please upload media first");

      setCreating(true);

      const priceFloat = Number.parseFloat(priceUsd || "0");
      const priceUnits = BigInt(Math.round((Number.isFinite(priceFloat) ? priceFloat : 0) * 1e6)); // USDC 6dp

      const promise = createPost(ADDR.USDC, priceUnits, subGate, uri);
      toast.promise(promise, {
        loading: "Creating post…",
        success: (hash: `0x${string}`) => (
          <div className="flex flex-col gap-1">
            <span>Post created</span>
            <button
              className="underline underline-offset-2 opacity-80 hover:opacity-100 text-left"
              onClick={() => window.open(basescanTx(hash), "_blank")}
            >
              View on BaseScan
            </button>
          </div>
        ),
        error: (e: any) => e?.shortMessage || e?.message || "Create failed",
      });

      await promise;

      if (shareFarcaster) {
        void (async () => {
          try {
            const r = await fetch("/api/farcaster/cast", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: "New post on OnlyStars ✨",
                uri,
                price: priceFloat,
                gated: subGate,
              }),
            });
            if (!r.ok) throw new Error("Cast failed");
            toast.success("Shared to Farcaster");
          } catch (err: any) {
            toast(`Unable to share to Farcaster: ${err?.message ?? "Unknown error"}`, { icon: "ℹ️" });
          }
        })();
      }

      setUri("");
      setPriceUsd("0.00");
      setSubGate(false);
      onCreated?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage || e?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="card space-y-4 w-full max-w-2xl mx-auto px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-semibold">Create a post</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Uploader + preview */}
        <div className="space-y-3">
          <DropUploader onFile={onPick} busy={uploading} />
          <div className="overflow-hidden rounded-xl border border-white/10">
            {uri ? (
              isImg(uri) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uri}
                  className="h-auto w-full"
                  alt=""
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              ) : isVideo(uri) ? (
                <video src={uri} className="h-auto w-full" controls playsInline preload="metadata" />
              ) : (
                <div className="bg-black/40 p-4 text-sm opacity-70">File uploaded</div>
              )
            ) : (
              <div className="bg-black/40 p-4 text-sm opacity-70">No file selected</div>
            )}
          </div>
        </div>

        {/* Pricing + gating */}
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <span className="w-32 text-sm opacity-80">Price (USDC)</span>
            <PriceInput value={priceUsd} onChange={setPriceUsd} aria-label="Price in USDC per post" />
            <span className="text-xs opacity-60">0 = free</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={subGate}
              onChange={(e) => setSubGate(e.target.checked)}
              aria-label="Gate by subscription"
            />
            <span className="text-sm">Gated by subscription</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shareFarcaster}
              onChange={(e) => setShareFarcaster(e.target.checked)}
              aria-label="Share to Farcaster"
            />
            <span className="text-sm">Share to Farcaster (optional)</span>
          </label>

          <div className="rounded-xl border border-dashed border-white/15 p-3 text-xs opacity-70">
            Tip: Short videos load faster and sell better. Images are cached on first view.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={onCreate} disabled={creating || !uri}>
          {creating ? "Creating…" : "Create post"}
        </button>
        {uri && (
          <button className="btn-secondary" onClick={() => setUri("")} disabled={creating || uploading}>
            Clear selection
          </button>
        )}
      </div>
    </section>
  );
}

function PostRow({
  id,
  onChanged,
}: {
  id: bigint;
  onChanged?: (() => void) | undefined;
}) {
  const { data: postData } = usePost(id);

  type MaybePost =
    | readonly [
        unknown,
        `0x${string}` | undefined,
        bigint | undefined,
        boolean | undefined,
        boolean | undefined,
        string | undefined
      ]
    | undefined;

  const post = postData as unknown as MaybePost;

  const token = post?.[1] ?? ADDR.USDC;
  const price = post?.[2] ?? 0n;
  const active = post?.[3] ?? true;
  const subGate = post?.[4] ?? false;
  const uri = post?.[5] ?? "";

  const { update: updatePost } = useUpdatePost();

  const [editUri, setEditUri] = useState(uri);
  const [editPrice, setEditPrice] = useState(fmt6(price));
  const [editGate, setEditGate] = useState(subGate);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function pickReplace(file: File) {
    const isImage = file.type.startsWith("image/");
    const isVideoType = file.type.startsWith("video/");
    if (!isImage && !isVideoType) return toast.error("Pick an image or video");
    if (isImage && file.size > MAX_IMAGE_BYTES) return toast.error("Image exceeds 4 MB");
    if (isVideoType && file.size > MAX_VIDEO_BYTES) return toast.error("Video exceeds 15 MB");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) return toast.error(json?.error || "Upload failed");
      setEditUri(String(json.url));
      toast.success("Replaced file");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
  }

  const save = async () => {
    try {
      if (!token) throw new Error("Missing token (USDC) address.");
      setSaving(true);
      const priceFloat = Number.parseFloat(editPrice || "0");
      const priceUnits = BigInt(Math.round((Number.isFinite(priceFloat) ? priceFloat : 0) * 1e6));
      const promise = updatePost(id, token, priceUnits, active, editGate, editUri);
      toast.promise(promise, {
        loading: "Saving…",
        success: (hash: `0x${string}`) => (
          <div className="flex flex-col gap-1">
            <span>Post updated</span>
            <button
              className="underline underline-offset-2 opacity-80 hover:opacity-100 text-left"
              onClick={() => window.open(basescanTx(hash), "_blank")}
            >
              View on BaseScan
            </button>
          </div>
        ),
        error: (e: any) => e?.shortMessage || e?.message || "Update failed",
      });
      await promise;
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage || e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    try {
      if (!token) throw new Error("Missing token (USDC) address.");
      setToggling(true);
      const priceFloat = Number.parseFloat(editPrice || "0");
      const priceUnits = BigInt(Math.round((Number.isFinite(priceFloat) ? priceFloat : 0) * 1e6));
      const promise = updatePost(id, token, priceUnits, !active, editGate, editUri);
      toast.promise(promise, {
        loading: active ? "Deactivating…" : "Activating…",
        success: (hash: `0x${string}`) => (
          <div className="flex flex-col gap-1">
            <span>{!active ? "Post activated" : "Post deactivated"}</span>
            <button
              className="underline underline-offset-2 opacity-80 hover:opacity-100 text-left"
              onClick={() => window.open(basescanTx(hash), "_blank")}
            >
              View on BaseScan
            </button>
          </div>
        ),
        error: (e: any) => e?.shortMessage || e?.message || "Toggle failed",
      });
      await promise;
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage || e?.message || "Toggle failed");
    } finally {
      setToggling(false);
    }
  };

  const softDelete = async () => {
    if (!confirm("Delete this post? This hides it in the app (soft delete).")) return;
    try {
      setDeleting(true);
      const res = await fetch("/api/content/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "post", id: id.toString() }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Post deleted (hidden)");
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">Post #{id.toString()}</div>
        <div className="text-sm opacity-70">{active ? "Active" : "Inactive"}</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        {isImg(editUri) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={editUri}
            className="h-auto w-full"
            alt=""
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
        ) : isVideo(editUri) ? (
          <video src={editUri} className="h-auto w-full" controls playsInline preload="metadata" />
        ) : (
          <div className="bg-black/40 p-4 text-sm opacity-70">No media</div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn" onClick={() => document.getElementById(`replace-${id}`)?.click()}>
              Replace file
            </button>
            <input
              id={`replace-${id}`}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) void pickReplace(f);
                e.currentTarget.value = "";
              }}
            />
            <span className="text-xs opacity-60">Image ≤ 4 MB · Video ≤ 15 MB</span>
          </div>
          <label className="flex items-center gap-2">
            <span className="w-28 text-sm opacity-80">Price (USDC)</span>
            <PriceInput value={editPrice} onChange={setEditPrice} />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editGate}
              onChange={(e) => setEditGate(e.target.checked)}
              aria-label="Gate by subscription"
            />
            <span className="text-sm">Gated by subscription</span>
          </label>
        </div>

        <div className="flex flex-wrap items-start gap-2 md:items-end">
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button className="btn-secondary" onClick={toggleActive} disabled={toggling}>
            {active ? "Deactivate" : "Activate"}
          </button>
          <button className="btn-danger" onClick={softDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostList({
  ids,
  loading,
  onChanged,
}: {
  ids: bigint[];
  loading?: boolean;
  onChanged?: () => void;
}) {
  if (loading) return <div className="card">Loading posts…</div>;
  const empty = !ids || ids.length === 0;
  if (empty) return <div className="opacity-70">No posts yet.</div>;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Your posts</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {ids.map((id) => (
          <PostRow key={`${id}`} id={id} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ Plans ------------------------------ */

function PlanCreator({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [days, setDays] = useState(30);
  const [priceUsd, setPriceUsd] = useState("0.00");
  const [creating, setCreating] = useState(false);

  const { createPlan } = useCreatePlanOnchain();

  const onCreate = async () => {
    try {
      setCreating(true);
      if (!ADDR.USDC) throw new Error("Missing USDC address (NEXT_PUBLIC_USDC).");
      if (!ADDR.HUB) throw new Error("Missing HUB address (NEXT_PUBLIC_CREATOR_HUB).");

      const priceFloat = Number.parseFloat(priceUsd || "0");
      const priceUnits = BigInt(Math.round((Number.isFinite(priceFloat) ? priceFloat : 0) * 1e6));

      const promise = createPlan(ADDR.USDC, priceUnits, days, (name || "Plan").trim(), "");
      toast.promise(promise, {
        loading: "Creating plan…",
        success: (hash: `0x${string}`) => (
          <div className="flex flex-col gap-1">
            <span>Plan created</span>
            <button
              className="underline underline-offset-2 opacity-80 hover:opacity-100 text-left"
              onClick={() => window.open(basescanTx(hash), "_blank")}
            >
              View on BaseScan
            </button>
          </div>
        ),
        error: (e: any) => e?.shortMessage || e?.message || "Create failed",
      });
      await promise;

      setName("");
      setDays(30);
      setPriceUsd("0.00");
      onCreated?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage || e?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="text-xl font-semibold">Create a plan</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2">
          <span className="w-20 text-sm opacity-80">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
            placeholder="Plan name"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-20 text-sm opacity-80">Period</span>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.currentTarget.value) || 30))}
            className="w-24 rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none ring-pink-500/40 focus:ring"
          />
          <span className="text-sm opacity-60">days</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="w-20 text-sm opacity-80">Price</span>
          <PriceInput value={priceUsd} onChange={setPriceUsd} aria-label="USDC per period" />
          <span className="text-sm opacity-60">USDC / period</span>
        </label>
      </div>
      <button className="btn" onClick={onCreate} disabled={creating}>
        {creating ? "Creating…" : "Create plan"}
      </button>
    </section>
  );
}

function PlanRow({
  id,
  onChanged,
}: {
  id: bigint;
  onChanged?: (() => void) | undefined;
}) {
  const { data: planData } = usePlan(id);

  type MaybePlan =
    | readonly [
        unknown,
        `0x${string}` | undefined,
        bigint | undefined,
        number | bigint | undefined,
        boolean | undefined,
        string | undefined,
        string | undefined
      ]
    | undefined;

  const plan = planData as unknown as MaybePlan;

  const price = (plan?.[2] ?? 0n) as bigint;
  const days = Number(plan?.[3] ?? 30);
  const active = Boolean(plan?.[4] ?? true);
  const name = String(plan?.[5] ?? "Plan");
  const metadataURI = String(plan?.[6] ?? "");

  const { update: updatePlan } = useUpdatePlan();

  const [toggling, setToggling] = useState(false);
  const [retiring, setRetiring] = useState(false);

  const toggleActive = async () => {
    try {
      setToggling(true);
      const promise = updatePlan(id, name, metadataURI, price, days, !active);
      toast.promise(promise, {
        loading: active ? "Deactivating…" : "Activating…",
        success: (hash: `0x${string}`) => (
          <div className="flex flex-col gap-1">
            <span>{!active ? "Plan activated" : "Plan deactivated"}</span>
            <button
              className="underline underline-offset-2 opacity-80 hover:opacity-100 text-left"
              onClick={() => window.open(basescanTx(hash), "_blank")}
            >
              View on BaseScan
            </button>
          </div>
        ),
        error: (e: any) => e?.shortMessage || e?.message || "Toggle failed",
      });
      await promise;
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.shortMessage || e?.message || "Toggle failed");
    } finally {
      setToggling(false);
    }
  };

  const retirePlan = async () => {
    if (!confirm("Retire this plan? New users won’t see it; current subscribers keep access.")) return;
    try {
      setRetiring(true);
      const promise = updatePlan(id, name, metadataURI, price, days, false);
      toast.promise(promise, {
        loading: "Retiring…",
        success: (hash: `0x${string}`) => (
          <div className="flex flex-col gap-1">
            <span>Plan retired</span>
            <button
              className="underline underline-offset-2 opacity-80 hover:opacity-100 text-left"
              onClick={() => window.open(basescanTx(hash), "_blank")}
            >
              View on BaseScan
            </button>
          </div>
        ),
        error: (e: any) => e?.shortMessage || e?.message || "Retire failed",
      });
      await promise;
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Retire failed");
    } finally {
      setRetiring(false);
    }
  };

  return (
    <div className="card flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{name}</div>
        <div className="text-sm opacity-70">
          {fmt6(price)} USDC / {days}d {active ? "" : "· inactive"}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={toggleActive} disabled={toggling}>
          {active ? "Deactivate" : "Activate"}
        </button>
        <button className="btn-danger" onClick={retirePlan} disabled={retiring}>
          {retiring ? "Retiring…" : "Retire"}
        </button>
      </div>
    </div>
  );
}

function PlanList({
  ids,
  loading,
  onChanged,
}: {
  ids: bigint[];
  loading?: boolean;
  onChanged?: () => void;
}) {
  if (loading) return <div className="card">Loading plans…</div>;
  if (!ids || ids.length === 0) return <div className="opacity-70">No plans yet.</div>;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Your plans</h2>
      <div className="grid gap-4">
        {ids.map((id) => (
          <PlanRow key={`${id}`} id={id} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}
