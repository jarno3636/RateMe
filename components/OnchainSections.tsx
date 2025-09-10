// components/OnchainSections.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Address, Abi } from 'viem';
import { isAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import { CREATOR_HUB_ABI, CREATOR_HUB_ADDR } from '@/lib/creatorHub';
import SubscribeButton from './SubscribeButton';
import BuyPostButton from './BuyPostButton';
import { Loader2, RefreshCw } from 'lucide-react';

type Plan = {
  id: bigint;
  token: Address;
  pricePerPeriod: bigint;
  periodDays: number;
  active: boolean;
  name: string;
  metadataURI: string;
};

type Post = {
  id: bigint;
  token: Address;
  price: bigint;
  active: boolean;
  accessViaSub: boolean;
  uri: string;
};

type TokenMeta = {
  decimals: number;
  symbol?: string;
};

// Minimal ERC20 ABI for decimals/symbol
const ERC20_MINI_ABI = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const satisfies Abi;

export default function OnchainSections({ creatorAddress }: { creatorAddress?: Address | null }) {
  const pub = usePublicClient();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [tokenMeta, setTokenMeta] = useState<Record<string, TokenMeta>>({});

  const hubAddr = CREATOR_HUB_ADDR as Address;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setPlans(null);
    setPosts(null);
    setTokenMeta({});

    try {
      if (!pub) throw new Error('Public client unavailable');
      if (!creatorAddress || !isAddress(creatorAddress)) {
        // Legit state, just show empty UI
        setPlans([]);
        setPosts([]);
        return;
      }
      if (!isAddress(hubAddr) || /^0x0{40}$/.test(hubAddr.slice(2))) {
        throw new Error('CreatorHub address not configured');
      }

      // 1) Read IDs
      const [planIds, postIds] = await Promise.all([
        pub.readContract({
          address: hubAddr,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'getCreatorPlanIds',
          args: [creatorAddress],
        }) as Promise<bigint[]>,
        pub.readContract({
          address: hubAddr,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'getCreatorPostIds',
          args: [creatorAddress],
        }) as Promise<bigint[]>,
      ]);

      // 2) Multicall to fetch plan/post structs
      const [planCalls, postCalls] = [
        planIds.map((id) => ({
          address: hubAddr,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'plans',
          args: [id],
        })),
        postIds.map((id) => ({
          address: hubAddr,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'posts',
          args: [id],
        })),
      ];

      const [planRes, postRes] = await Promise.all([
        planCalls.length
          ? pub.multicall({ contracts: planCalls })
          : Promise.resolve([] as any[]),
        postCalls.length
          ? pub.multicall({ contracts: postCalls })
          : Promise.resolve([] as any[]),
      ]);

      const plansParsed: Plan[] = planIds.map((id, i) => {
        // Expect tuple: (creator, token, pricePerPeriod, periodDays, active, name, metadataURI)
        const r: any = (planRes[i] as any)?.result ?? [];
        return {
          id,
          token: r[1] as Address,
          pricePerPeriod: BigInt(r[2] ?? 0n),
          periodDays: Number(r[3] ?? 0),
          active: Boolean(r[4]),
          name: String(r[5] ?? ''),
          metadataURI: String(r[6] ?? ''),
        };
      });

      const postsParsed: Post[] = postIds.map((id, i) => {
        // Expect tuple: (creator, token, price, active, accessViaSub, uri)
        const r: any = (postRes[i] as any)?.result ?? [];
        return {
          id,
          token: r[1] as Address,
          price: BigInt(r[2] ?? 0n),
          active: Boolean(r[3]),
          accessViaSub: Boolean(r[4]),
          uri: String(r[5] ?? ''),
        };
      });

      const activePlans = plansParsed.filter((p) => p.active);
      const activePosts = postsParsed.filter((p) => p.active);

      setPlans(activePlans);
      setPosts(activePosts);

      // 3) Collect unique tokens and read decimals+symbol
      const uniqueTokens = Array.from(
        new Set(
          [...activePlans.map((p) => p.token), ...activePosts.map((p) => p.token)].filter((a) =>
            isAddress(a)
          )
        )
      ) as Address[];

      if (uniqueTokens.length) {
        const decCalls = uniqueTokens.map((t) => ({ address: t, abi: ERC20_MINI_ABI, functionName: 'decimals' as const }));
        const symCalls = uniqueTokens.map((t) => ({ address: t, abi: ERC20_MINI_ABI, functionName: 'symbol' as const }));

        const [decRes, symRes] = await Promise.all([
          pub.multicall({ contracts: decCalls }),
          pub.multicall({ contracts: symCalls }),
        ]);

        const meta: Record<string, TokenMeta> = {};
        uniqueTokens.forEach((t, i) => {
          const dec = Number((decRes[i] as any)?.result ?? 18);
          const sym = (symRes[i] as any)?.result as string | undefined;
          meta[t.toLowerCase()] = {
            decimals: Number.isFinite(dec) ? dec : 18,
            symbol: sym && typeof sym === 'string' ? sym : undefined,
          };
        });
        setTokenMeta(meta);
      }
    } catch (e: any) {
      setErr(e?.message || 'Failed to load on-chain data');
      setPlans([]);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [pub, creatorAddress, hubAddr]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const fmtAmount = useCallback(
    (amount: bigint, token: Address) => {
      const meta = tokenMeta[token?.toLowerCase?.() as string];
      const decimals = meta?.decimals ?? 6; // default to 6 if unknown
      const sym = meta?.symbol ?? '';
      // Simple decimal formatter (not for scientific precision, only display)
      const asNum = Number(amount) / Math.pow(10, decimals);
      return `${asNum.toLocaleString(undefined, { maximumFractionDigits: Math.min(6, decimals) })}${
        sym ? ` ${sym}` : ''
      }`;
    },
    [tokenMeta]
  );

  const hasWallet = Boolean(creatorAddress && isAddress(creatorAddress));

  return (
    <div className="space-y-8">
      {/* Header / status */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading on-chain sections…
        </div>
      )}
      {err && !loading && (
        <div className="flex items-center justify-between rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-rose-200">
          <span className="text-sm">Error: {err}</span>
          <button
            onClick={load}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-300/30 px-2.5 py-1.5 text-xs hover:bg-rose-400/10"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Plans */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subscription Plans</h2>
        {loading && !plans ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : !hasWallet ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Creator has not linked a wallet address yet.
          </div>
        ) : (plans?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No active plans.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {plans!.map((p) => (
              <div key={String(p.id)} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate" title={p.name || 'Plan'}>
                    {p.name || 'Plan'}
                  </div>
                  <div className="text-sm text-slate-300 whitespace-nowrap">
                    {fmtAmount(p.pricePerPeriod, p.token)} / {p.periodDays}d
                  </div>
                </div>
                {p.metadataURI ? (
                  <div className="mt-2 line-clamp-2 text-sm text-slate-300" title={p.metadataURI}>
                    {p.metadataURI}
                  </div>
                ) : null}
                <div className="mt-3">
                  <SubscribeButton planId={p.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Posts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Paid Posts</h2>
        {loading && !posts ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : !hasWallet ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Creator has not linked a wallet address yet.
          </div>
        ) : (posts?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No active paid posts.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts!.map((p) => (
              <article key={String(p.id)} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div
                  className="aspect-video w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900"
                  aria-hidden="true"
                />
                <div className="mt-2 line-clamp-1 text-sm font-medium" title={p.uri || `Post #${p.id}`}>
                  {p.uri || `Post #${p.id}`}
                </div>
                <div className="text-xs text-slate-400">
                  {fmtAmount(p.price, p.token)} {p.accessViaSub ? '• also via subscription' : ''}
                </div>
                <div className="mt-2">
                  <BuyPostButton postId={p.id} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
