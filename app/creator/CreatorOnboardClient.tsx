// app/creator/DashboardClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { Abi, Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { base as BASE } from 'viem/chains';

import { PROFILE_REGISTRY_ABI } from '@/lib/profileRegistry/abi';
import { REGISTRY_ADDRESS } from '@/lib/profileRegistry/constants';

type Profile = {
  id: bigint;
  owner: `0x${string}`;
  handle: string;
  displayName: string;
  avatarURI: string;
  bio: string;
  fid: bigint;
  createdAtMs: number;
};

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const owner = useMemo(
    () => (isConnected && address ? (address as `0x${string}`) : null),
    [isConnected, address]
  );

  useEffect(() => {
    let aborted = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (!owner) {
          setProfiles([]);
          return;
        }

        const rpc =
          process.env.NEXT_PUBLIC_BASE_RPC_URL ||
          process.env.BASE_RPC_URL ||
          undefined;

        const client = createPublicClient({
          chain: BASE,
          transport: http(rpc),
        });

        // 1) IDs owned by this wallet
        const ids = (await client.readContract({
          address: REGISTRY_ADDRESS as Address,
          abi: PROFILE_REGISTRY_ABI as Abi,
          functionName: 'getProfilesByOwner',
          args: [owner],
        })) as bigint[];

        if (aborted) return;

        if (!ids || ids.length === 0) {
          setProfiles([]);
          return;
        }

        // 2) Flatten details for those ids (single on-chain call)
        const tuple = (await client.readContract({
          address: REGISTRY_ADDRESS as Address,
          abi: PROFILE_REGISTRY_ABI as Abi,
          functionName: 'getProfilesFlat',
          args: [ids],
        })) as [
          bigint[],            // outIds
          `0x${string}`[],     // owners
          string[],            // handles
          string[],            // displayNames
          string[],            // avatarURIs
          string[],            // bios
          bigint[],            // fids
          bigint[]             // createdAts (seconds)
        ];

        if (aborted) return;

        const rows = {
          outIds: tuple[0],
          owners: tuple[1],
          handles: tuple[2],
          displayNames: tuple[3],
          avatarURIs: tuple[4],
          bios: tuple[5],
          fids: tuple[6],
          createdAts: tuple[7],
        };

        const mapped: Profile[] = rows.outIds.map((id, i) => ({
          id,
          owner: rows.owners[i],
          handle: rows.handles[i] || '',
          displayName: rows.displayNames[i] || '',
          avatarURI: rows.avatarURIs[i] || '',
          bio: rows.bios[i] || '',
          fid: rows.fids[i] ?? 0n,
          createdAtMs: Number(rows.createdAts[i] ?? 0n) * 1000,
        }));

        setProfiles(mapped);
      } catch (e: any) {
        setError(e?.message || 'Failed to load profiles');
        setProfiles([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    run();
    return () => {
      aborted = true;
    };
  }, [owner]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {isConnected ? (
            <>Connected as <span className="text-slate-200">{address}</span></>
          ) : (
            <>Connect your wallet to view your profiles</>
          )}
        </div>
        <ConnectButton chainStatus="none" showBalance={false} />
      </div>

      {loading && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && profiles.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          No profiles found for this wallet.
        </div>
      )}

      {!loading && !error && profiles.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {profiles.map((p) => (
            <li key={p.id.toString()} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-slate-400">#{p.id.toString()}</div>
              <div className="mt-1 text-lg font-medium">{p.displayName || p.handle || '(no name)'}</div>
              <div className="text-xs text-slate-400">@{p.handle}</div>
              <div className="mt-2 line-clamp-3 text-sm text-slate-300">{p.bio}</div>
              <div className="mt-3 text-xs text-slate-400">
                Created:{' '}
                {p.createdAtMs ? new Date(p.createdAtMs).toLocaleString() : '—'}
              </div>
              <a
                className="mt-3 inline-block text-sm text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
                href={`/creator/${encodeURIComponent(p.handle || p.id.toString())}`}
              >
                Open page →
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
