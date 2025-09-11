'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

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

  async function uploadAvatar(f: File) {
    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', f);
      const res = await fetch('/api/upload', { method: 'POST', body: form, cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Upload failed');
      setAvatarUrl(j.url);
      toast.success('Image uploaded');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function save(partial: { avatarUrl?: string; bio?: string }) {
    try {
      setSaving(true);
      const res = await fetch('/api/creator/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: creatorId, ...partial }),
        cache: 'no-store',
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Save failed');
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Avatar editor */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-sm font-medium mb-2">Profile photo</div>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl || '/icon-192.png'}
            alt="avatar preview"
            className="h-20 w-20 rounded-full ring-1 ring-white/10 object-cover"
          />
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
                className="hidden"
              />
              {uploading ? 'Uploading…' : 'Upload from device'}
            </label>

            <button
              type="button"
              disabled={!avatarUrl || saving}
              onClick={() => save({ avatarUrl })}
              className="btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save photo'}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Images are stored on Vercel Blob (public). You can update anytime.
        </p>
      </div>

      {/* Bio editor */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-sm font-medium mb-2">Bio</div>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          placeholder="Tell people who you are…"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => save({ bio })}
            disabled={saving}
            className="btn disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save bio'}
          </button>
        </div>
      </div>
    </div>
  );
}
