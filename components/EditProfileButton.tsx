// components/EditProfileButton.tsx
'use client';

import { useState } from 'react';

export default function EditProfileButton({ creatorId, currentBio, currentAvatar }: {
  creatorId: string;
  currentBio?: string;
  currentAvatar?: string;
}) {
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(currentBio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/creator/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: creatorId, bio, avatarUrl }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to save');
      setOpen(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn"
      >
        Edit Profile
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>

            <label className="block text-sm mb-2">Avatar URL</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm mb-4"
              placeholder="https://..."
            />

            <label className="block text-sm mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm mb-4"
              rows={4}
            />

            {error && <p className="text-sm text-rose-400 mb-3">{error}</p>}

            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={onSave}
                className="btn"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
