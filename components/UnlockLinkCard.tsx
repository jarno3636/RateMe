// /components/UnlockLinkCard.tsx
"use client";

export default function UnlockLinkCard({
  url,
  unlocked,
  description,
  coverUrl,
}: {
  url: string;             // the external link stored on-chain
  unlocked: boolean;       // caller decides if viewer has access
  description?: string;    // optional (MVP: not persisted on-chain)
  coverUrl?: string;       // optional (MVP: cosmetic only)
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="w-full h-40 object-cover" />
      ) : (
        <div className="h-2 w-full bg-gradient-to-r from-pink-500/30 via-fuchsia-400/30 to-violet-400/30" />
      )}

      <div className="p-4">
        <div className="text-lg font-semibold">External Link Unlock</div>
        {description && <div className="text-sm opacity-80 mt-1">{description}</div>}
        <div className="text-xs opacity-60 mt-1 truncate">{url}</div>

        <div className="mt-3">
          {unlocked ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              Open link
            </a>
          ) : (
            <div className="text-sm opacity-70">
              Purchase to unlock this link.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
