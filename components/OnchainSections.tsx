// components/OnchainSections.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Address, Abi } from 'viem';
import { isAddress as viemIsAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import { CREATOR_HUB_ABI, CREATOR_HUB_ADDR } from '@/lib/creatorHub';
import SubscribeButton from './SubscribeButton';
import BuyPostButton from './BuyPostButton';
import SafeMedia from './SafeMedia';
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

function parseContentHints(u: string) {
  try {
    const [base, hash = ''] = u.split('#');
    const qs = new URLSearchParams(hash);
    const previewUri = (qs.get('rm_preview') || '').trim();
    const blur = qs.get('rm_blur') === '1';
    return { base: base.trim(), previewUri, blur };
  } catch {
    return { base: u, previewUri: '', blur: false };
  }
}

// ---- Safe helpers (avoid viem throwing on undefined) ----
function safeIsAddress(a: unknown): a is Address {
  return typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a) && viemIsAddress(a as Address);
}

export default function OnchainSections({ creatorAddress }: { creatorAddress?: Address | null }) {
  const pub = usePublicClient();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [tokenMeta, setTokenMeta] = useState<Record<string, TokenMeta>>({});

  const hubAddr = CREATOR_HUB_ADDR as Address | undefined;

  // Resilient multicall wrapper with fallback to per-call reads
  const multicall = useCallback(
    async (contracts: Array<{ address: Address; abi: Abi; functionName: string; args?: any[] }>) => {
      if (!contracts.length || !pub) return [];
      // viem public client may or may not have multicall available in some envs
      const hasMulti = typeof (pub as any)?.multicall === 'function';
      if (hasMulti) {
        const res = await (pub as any).multicall({
          allowFailure: true,
          contracts,
        }).catch(() => null);
        if (Array.isArray(res)) return res;
      }
      // Fallback: do individual reads
      const out: any[] = [];
      for (const c of contracts) {
        try {
          const result = await pub.readContract({
            address: c.address,
            abi: c.abi,
            functionName: c.functionName as any,
            args: (c as any).args ?? [],
          });
          out.push({ result });
        } catch {
          out.push({ error: true });
        }
      }
      return out;
    },
    [pub]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setPlans(null);
    setPosts(null);
    setTokenMeta({});

    try {
      if (!pub) throw new Error('Public client unavailable');

      // Guard: creator wallet missing
      if (!creatorAddress || !safeIsAddress(creatorAddress)) {
        setPlans([]);
        setPosts([]);
        return;
      }

      // Guard: hub address misconfigured
      if (!safeIsAddress(hubAddr)) {
        // This was the crash cause: calling isAddress(undefined)
        throw new Error('CreatorHub address not configured. Set CREATOR_HUB_ADDR to a non-zero 0x… address.');
      }

      // Read plan & post ids
      const [planIds, postIds] = await Promise.all([
        pub.readContract({
          address: hubAddr,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'getCreatorPlanIds',
          args: [creatorAddress],
        }).catch(() => []) as Promise<bigint[]>,
        pub.readContract({
          address: hubAddr,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'getCreatorPostIds',
          args: [creatorAddress],
        }).catch(() => []) as Promise<bigint[]>,
      ]);

      // Build detail calls
      const planCalls = planIds.map((id) => ({
        address: hubAddr!,
        abi: CREATOR_HUB_ABI as Abi,
        functionName: 'plans',
        args: [id],
      }));
      const postCalls = postIds.map((id) => ({
        address: hubAddr!,
        abi: CREATOR_HUB_ABI as Abi,
        functionName: 'posts',
        args: [id],
      }));

      const [planRes, postRes] = await Promise.all([multicall(planCalls), multicall(postCalls)]);

      const plansParsed: Plan[] = planIds.map((id, i) => {
        const entry: any = planRes?.[i];
        const r: any = entry?.result ?? [];
        // Defensive indexing: r could be tuple or empty
        const token = (r?.[1] || '0x0000000000000000000000000000000000000000') as Address;
        const pricePerPeriod = BigInt(r?.[2] ?? 0n);
        const periodDays = Number(r?.[3] ?? 0);
        const active = Boolean(r?.[4]);
        const name = String(r?.[5] ?? '');
        const metadataURI = String(r?.[6] ?? '');
        return { id, token, pricePerPeriod, periodDays, active, name, metadataURI };
      });

      const postsParsed: Post[] = postIds.map((id, i) => {
        const entry: any = postRes?.[i];
        const r: any = entry?.result ?? [];
        const token = (r?.[1] || '0x0000000000000000000000000000000000000000') as Address;
        const price = BigInt(r?.[2] ?? 0n);
        const active = Boolean(r?.[3]);
        const accessViaSub = Boolean(r?.[4]);
        const uri = String(r?.[5] ?? '');
        return { id, token, price, active, accessViaSub, uri };
      });

      const activePlans = plansParsed.filter((p) => p.active);
      const activePosts = postsParsed.filter((p) => p.active);

      setPlans(activePlans);
      setPosts(activePosts);

      // Token metadata
      const tokenSet = new Set<string>();
      for (const t of [...activePlans.map((p) => p.token), ...activePosts.map((p) => p.token)]) {
        if (safeIsAddress(t)) tokenSet.add(t.toLowerCase());
      }
      const uniqueTokens = Array.from(tokenSet) as Address[];

      if (uniqueTokens.length) {
        const decCalls = uniqueTokens.map((t) => ({ address: t, abi: ERC20_MINI_ABI, functionName: 'decimals' as const }));
        const symCalls = uniqueTokens.map((t) => ({ address: t, abi: ERC20_MINI_ABI, functionName: 'symbol' as const }));
        const [decRes, symRes] = await Promise.all([multicall(decCalls), multicall(symCalls)]);

        const meta: Record<string, TokenMeta> = {};
        uniqueTokens.forEach((t, i) => {
          const dec = Number(decRes?.[i]?.result ?? 18);
          const sym = symRes?.[i]?.result as string | undefined;
          meta[t.toLowerCase()] = {
            decimals: Number.isFinite(dec) ? dec : 18,
            symbol: typeof sym === 'string' && sym ? sym : undefined,
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
  }, [pub, creatorAddress, hubAddr, multicall]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => { alive = false; };
  }, [load]);

  const fmtAmount = useCallback(
    (amount: bigint, token: Address) => {
      const meta = tokenMeta[token?.toLowerCase?.() as string];
      const decimals = meta?.decimals ?? 6;
      const sym = meta?.symbol ?? '';
      const asNum = Number(amount) / Math.pow(10, decimals);
      return `${asNum.toLocaleString(undefined, { maximumFractionDigits: Math.min(6, decimals) })}${sym ? ` ${sym}` : ''}`;
    },
    [tokenMeta]
  );

  const hasWallet = Boolean(creatorAddress && safeIsAddress(creatorAddress));
  const parsedPosts = useMemo(() => {
    return (posts || []).map((p) => ({ ...p, hints: parseContentHints(p.uri || '') }));
  }, [posts]);

  return (
    <div className="space-y-8">
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
                  <div className="truncate font-medium" title={p.name || 'Plan'}>
                    {p.name || 'Plan'}
                  </div>
                  <div className="whitespace-nowrap text-sm text-slate-300">
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
        ) : (parsedPosts?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No active paid posts.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {parsedPosts.map((p) => {
              const { base, previewUri, blur } = p.hints;
              const displaySrc = previewUri || base;
              const shouldBlur = !previewUri && blur;

              return (
                <article key={String(p.id)} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="relative">
                    <div className={`relative ${shouldBlur ? 'blur-4xl select-none' : ''}`}>
                      <SafeMedia
                        src={displaySrc}
                        className="aspect-video w-full overflow-hidden"
                        rounded="rounded-lg"
                      />
                    </div>

                    {shouldBlur && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide">
                          Locked
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="sr-only">{p.uri}</span>

                  <div className="mt-2 text-xs text-slate-400">
                    {fmtAmount(p.price, p.token)}{p.accessViaSub ? ' • also via subscription' : ''}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <BuyPostButton postId={p.id} />
                    {p.accessViaSub ? (
                      <span className="text-[11px] text-slate-400">Subscribers unlock automatically</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
