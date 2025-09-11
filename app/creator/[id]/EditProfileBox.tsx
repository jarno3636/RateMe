// app/creator/[id]/EditProfileBox.tsx
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

  const save = async () => {
    try {
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-slate-400">Avatar URL</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            placeholder="https://... or ipfs://..."
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Paste a direct image link (HTTPS/IPFS). We’ll display it as your profile photo.
          </p>
        </div>

        <div>
          <label className="text-xs text-slate-400">Bio (optional)</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            rows={3}
            maxLength={280}
            placeholder="Tell fans what you offer"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
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
