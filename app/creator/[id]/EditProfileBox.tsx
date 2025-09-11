// app/creator/[id]/EditProfileBox.tsx
'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

const MAX_BIO_WORDS = 250;

export default function EditProfileBox({
  creatorId,
  currentAvatar,
  currentBio,
}: {
  creatorId: string;
  currentAvatar?: string | null;
  currentBio?: string | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || '');
  const [bio, setBio] = useState(currentBio || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const wordCount = bio.trim().split(/\s+/).filter(Boolean).length;

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // quick client-side checks (mirror server)
    if (!file.type.startsWith('image/')) {
      toast.error('Avatar must be an image');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Max 10 MB');
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
        // no cache on uploads
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok || !j?.url) {
        throw new Error(j?.error || `upload failed (${res.status})`);
      }
      setAvatarUrl(j.url);
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
      if (wordCount > MAX_BIO_WORDS) {
        throw new Error(`Bio must be ${MAX_BIO_WORDS} words or less`);
      }

      setSaving(true);
      const res = await fetch('/api/creator/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ id: creatorId, avatarUrl, bio }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || `save failed (${res.status})`);
      }
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="text-sm font-medium">Edit profile</div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Avatar upload & URL */}
        <div>
          <label className="text-xs text-slate-400">Profile photo</label>

          {/* Preview */}
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl || '/icon-192.png'}
              alt="avatar preview"
              className="h-16 w-16 rounded-full object-cover ring-1 ring-white/10"
            />
            <div className="flex-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
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
                Use a direct image link or upload (PNG/JPG/GIF/WebP ≤ 10 MB).
              </p>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs text-slate-400">Bio (max 250 words)</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            rows={4}
            placeholder="Tell fans what you offer"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <p className={`mt-1 text-[11px] ${wordCount > MAX_BIO_WORDS ? 'text-red-400' : 'text-slate-400'}`}>
            {wordCount}/{MAX_BIO_WORDS} words
          </p>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="btn inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
