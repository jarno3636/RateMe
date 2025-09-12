// components/EditProfileButton.tsx
'use client';

import { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import EditProfileBox from '@/app/creator/[id]/EditProfileBox';

export default function EditProfileButton({
  creatorId,
  currentAvatar,
  currentBio,
  onSaved, // optional callback
}: {
  creatorId: string;
  currentAvatar?: string | null;
  currentBio?: string | null;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);

  // We'll let EditProfileBox do the saving/refresh.
  // If you want to run extra client logic after save, pass onSaved.
  const handleSaved = () => {
    onSaved?.();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="btn inline-flex items-center"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Pencil className="h-4 w-4" />
        Edit profile
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal card */}
          <div className="relative z-[61] w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Edit profile</h3>
              <button
                className="btn-secondary p-1"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* We reuse your editor. It already calls router.refresh() on success. */}
            <EditProfileBox
              creatorId={creatorId}
              currentAvatar={currentAvatar}
              currentBio={currentBio}
              // Patch: add this optional prop in EditProfileBox (see below)
              onSaved={handleSaved}
            />
          </div>
        </div>
      )}
    </>
  );
}
