// app/creator/DashboardClient.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient } from 'wagmi';
import type { Address } from 'viem';
import { readProfilesByOwner, readProfilesFlat } from '@/lib/profileRegistry/reads';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
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

function bust(url: string) {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}t=${Date.now()}`;
}

export default function DashboardClient() {
  const { address } = useAccount();
  const pub = usePublicClient();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selected) || null,
    [profiles, selected]
  );

  async function load() {
    if (!address || !pub) return;
    setLoading(true);
    setErr(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // 1) Get profile ids for this owner
      const ids = await readProfilesByOwner(address as Address);
      if (ac.signal.aborted) return;

      if (!ids.length) {
        setProfiles([]);
        setSelected(null);
        return;
      }

      // 2) Flatten details for those ids
      const rows = await readProfilesFlat(ids);
      if (ac.signal.aborted) return;

      const mapped: Profile[] = rows.map((r) => ({
        id: r.id.toString(),
        owner: r.owner,
        handle: r.handle,
        displayName: r.displayName,
        avatarUrl: r.avatarURI || '/icon-192.png',
        bio: r.bio,
        fid: Number(r.fid),
        createdAt: Number(r.createdAt), // assume seconds or ms as provided by your reads()
      }));

      // newest first
      mapped.sort((a, b) => Number(b.id) - Number(a.id));

      setProfiles(mapped);
      setSelected((curr) => curr && mapped.some((m) => m.id === curr) ? curr : (mapped[0]?.id || null));
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setErr(e?.message || 'Failed to load your profiles');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, pub]);

  if (!address) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-300">
          Connect your wallet to manage your creator profiles.
        </p>
      </div>
    );
  }

  if (loading && !profiles.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your profiles…
      </div>
    );
  }

  if (err && !profiles.length) {
    return (
      <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200 flex items-center justify-between">
        <p className="text-sm">Error: {err}</p>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-300/30 px-3 py-1.5 text-sm hover:bg-rose-400/10"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
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
      {/* Switcher + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`rounded-xl border px-3 py-2 text-sm transition ${
              selected === p.id
                ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
            title={`@${p.handle}`}
          >
            @{p.handle}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Selected profile header */}
      {selectedProfile && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bust(selectedProfile.avatarUrl || '/icon-192.png')}
              alt={selectedProfile.displayName || selectedProfile.handle}
              className="h-12 w-12 rounded-full ring-1 ring-white/10 object-cover"
            />
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {selectedProfile.displayName || `@${selectedProfile.handle}`}
              </div>
              <div className="text-xs text-slate-400 truncate">@{selectedProfile.handle}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href={`/creator/${encodeURIComponent(selectedProfile.id)}`}
                className="btn-secondary"
              >
                View public page
              </Link>
              <Link
                href={`/creator/${encodeURIComponent(selectedProfile.id)}#edit`}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                title="Edit profile"
              >
                Edit
              </Link>
            </div>
          </div>
          {selectedProfile.bio && (
            <p className="mt-2 text-sm text-slate-300">{selectedProfile.bio}</p>
          )}
        </div>
      )}

      {/* Managers */}
      {selected && (
        <>
          <PlanManager creatorId={selected} />
          <PostManager creatorId={selected} />
        </>
      )}
    </div>
  );
}
