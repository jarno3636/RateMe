// app/creator/[id]/EditProfileBox.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const MAX_BIO_WORDS = 250;
const MAX_AVATAR_MB = 10;

// Turn ipfs:// into a gateway URL for previewing
function ipfsToHttp(u?: string | null) {
  if (!u) return '';
  if (u.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${u.slice('ipfs://'.length)}`;
  return u;
}

// Append a cache-busting version param
function withVersion(url: string, v?: number) {
  if (!url) return url;
  const src = url.startsWith('ipfs://') ? ipfsToHttp(url) : url;
  if (!/^https?:\/\//i.test(src)) return src; // allow relative /icon-192.png
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}v=${v ?? Date.now()}`;
}

function wordCountOf(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function EditProfileBox({
  creatorId,
  currentAvatar,
  currentBio,
  onSaved,
}: {
  creatorId: string;
  currentAvatar?: string | null;
  currentBio?: string | null;
  onSaved?: () => void;
}) {
  const router = useRouter();

  // Collapsed by default
  const [open, setOpen] = useState(false);

  // Editable state (seeded from props)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || '');
  const [bio, setBio] = useState(currentBio || '');

  // Keep a snapshot to detect dirty state
  const [initialAvatar, setInitialAvatar] = useState(currentAvatar || '');
  const [initialBio, setInitialBio] = useState(currentBio || '');

  // Ops state
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep local state in sync when the panel re-opens (user might have saved elsewhere)
  useEffect(() => {
    if (!open) return;
    setAvatarUrl(currentAvatar || '');
    setBio(currentBio || '');
    setInitialAvatar(currentAvatar || '');
    setInitialBio(currentBio || '');
    // bump a small local version so preview updates if the props changed
    setAvatarVersion(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentAvatar, currentBio]);

  const wc = useMemo(() => wordCountOf(bio), [bio]);
  const previewSrc = useMemo(
    () => withVersion(avatarUrl || '/icon-192.png', avatarVersion),
    [avatarUrl, avatarVersion]
  );

  const isDirty = (avatarUrl || '') !== (initialAvatar || '') || (bio || '') !== (initialBio || '');
  const disableSave = saving || uploading || wc > MAX_BIO_WORDS || !isDirty;

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Avatar must be an image');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast.error(`Max ${MAX_AVATAR_MB} MB`);
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload?kind=avatar', {
        method: 'POST',
        body: fd,
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok || !j?.url) {
        throw new Error(j?.error || `upload failed (${res.status})`);
      }

      setAvatarUrl(j.url);
      setAvatarVersion(Date.now()); // local cache-bust while editing
      toast.success('Avatar uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  }

  const save = async () => {
    try {
      const wcNow = wordCountOf(bio);
      if (wcNow > MAX_BIO_WORDS) {
        throw new Error(`Bio must be ${MAX_BIO_WORDS} words or less`);
      }
      if (!isDirty) {
        toast('No changes to save');
        return;
      }

      setSaving(true);

      // ✅ canonical API path
      const res = await fetch(`/api/creator/${encodeURIComponent(creatorId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ avatarUrl, bio }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || `save failed (${res.status})`);
      }

      // If API returned the updated creator, use it for instant UI update
      const updated = j.creator as
        | { avatarUrl?: string; bio?: string; updatedAt?: number }
        | undefined;

      if (updated?.avatarUrl !== undefined) {
        setAvatarUrl(updated.avatarUrl || '');
        setInitialAvatar(updated.avatarUrl || '');
      }
      if (typeof updated?.bio === 'string') {
        setBio(updated.bio);
        setInitialBio(updated.bio);
      }
      if (updated?.updatedAt) setAvatarVersion(Number(updated.updatedAt)); // server-driven cache-bust

      toast.success('Profile updated');
      setOpen(false);

      // Refresh RSC view + notify parent if needed
      router.refresh();
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      {/* Header row with toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-cyan-200">Manage your profile</div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-50 hover:bg-cyan-300/20"
        >
          {open ? 'Close' : 'Edit profile'}
        </button>
      </div>

      {!open ? null : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Avatar upload & URL */}
            <div>
              <label className="text-xs text-slate-300">Profile photo</label>
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewSrc}
                  alt="avatar preview"
                  className="h-16 w-16 rounded-full object-cover ring-1 ring-white/10"
                />
                <div className="flex-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || saving}
                      className="btn-secondary text-xs disabled:opacity-60"
                    >
                      {uploading ? 'Uploading…' : 'Upload from device'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFile}
                    />
                  </div>

                  <input
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
                    placeholder="https://... or ipfs://..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Use a direct image link or upload (PNG/JPG/GIF/WebP ≤ {MAX_AVATAR_MB} MB).
                  </p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs text-slate-300">Bio (max {MAX_BIO_WORDS} words)</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
                rows={4}
                placeholder="Tell fans what you offer"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              <p
                className={`mt-1 text-[11px] ${
                  wc > MAX_BIO_WORDS ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {wc}/{MAX_BIO_WORDS} words
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={disableSave}
              className="btn inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : isDirty ? 'Save changes' : 'No changes'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
