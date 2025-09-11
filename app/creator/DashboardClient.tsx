// app/creator/DashboardClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import type { Address } from 'viem';
import { readProfilesByOwner, readProfilesFlat } from '@/lib/profileRegistry/reads';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import PlanManager from './PlanManager';
import PostManager from './PostManager';

type Profile = {
  id: string;
  owner: Address;
  handle: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  fid: number;
  createdAt: number;
};

export default function DashboardClient() {
  const { address } = useAccount();
  const pub = usePublicClient();
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selected) || null,
    [profiles, selected]
  );

  useEffect(() => {
    (async () => {
      if (!address || !pub) return;
      setLoading(true);
      try {
        const ids = await readProfilesByOwner(address as Address);
        if (!ids.length) {
          setProfiles([]);
          setSelected(null);
          return;
        }
        const rows = await readProfilesFlat(ids);
        const mapped: Profile[] = rows.map((r) => ({
          id: r.id.toString(),
          owner: r.owner,
          handle: r.handle,
          displayName: r.displayName,
          avatarUrl: r.avatarURI || '/icon-192.png',
          bio: r.bio,
          fid: Number(r.fid),
          createdAt: Number(r.createdAt),
        }));
        // newest first
        mapped.sort((a, b) => Number(b.id) - Number(a.id));
        setProfiles(mapped);
        setSelected(mapped[0]?.id || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [address, pub]);

  if (!address) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-300">Connect your wallet to manage your creator profiles.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your profiles…
      </div>
    );
  }

  if (!profiles.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-300">No profiles yet.</p>
        <Link href="/creator/register" className="btn mt-3 inline-flex items-center">
          <Plus className="mr-2 h-4 w-4" />
          Create your first profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* profile switcher */}
      <div className="flex flex-wrap items-center gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`rounded-xl border px-3 py-2 text-sm ${
              selected === p.id
                ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
            title={`@${p.handle}`}
          >
            @{p.handle}
          </button>
        ))}
      </div>

      {/* selected profile header */}
      {selectedProfile && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedProfile.avatarUrl || '/icon-192.png'}
              alt={selectedProfile.displayName || selectedProfile.handle}
              className="h-12 w-12 rounded-full ring-1 ring-white/10 object-cover"
            />
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {selectedProfile.displayName || `@${selectedProfile.handle}`}
              </div>
              <div className="text-xs text-slate-400 truncate">@{selectedProfile.handle}</div>
            </div>
            <div className="ml-auto">
              <Link href={`/creator/${encodeURIComponent(selectedProfile.id)}`} className="btn-secondary">
                View public page
              </Link>
            </div>
          </div>
          {selectedProfile.bio && <p className="mt-2 text-sm text-slate-300">{selectedProfile.bio}</p>}
        </div>
      )}

      {/* managers */}
      {selected && (
        <>
          <PlanManager creatorId={selected} />
          <PostManager creatorId={selected} />
        </>
      )}
    </div>
  );
}
