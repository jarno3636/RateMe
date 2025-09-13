'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Address, Abi } from 'viem';
import { isAddress, getAddress } from 'viem';
import { usePublicClient, useAccount } from 'wagmi';
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

// small promise map limiter
async function pMap<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0, active = 0;
  return await new Promise((resolve, reject) => {
    const next = () => {
      if (i >= items.length && active === 0) return resolve(out);
      while (active < limit && i < items.length) {
        const cur = i++;
        active++;
        fn(items[cur]).then((r) => {
          out[cur] = r;
          active--; next();
        }).catch(reject);
      }
    };
    next();
  });
}

export default function OnchainSections({ creatorAddress }: { creatorAddress?: Address | null }) {
  const pub = usePublicClient();
  const { address: userAddr, isConnected } = useAccount();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [tokenMeta, setTokenMeta] = useState<Record<string, TokenMeta>>({});
  const [subActive, setSubActive] = useState(false);
  const [unlockedPosts, setUnlockedPosts] = useState<Record<string, boolean>>({});

  const hubAddr: Address | null = useMemo(() => {
    try { return isAddress(CREATOR_HUB_ADDR as Address) ? (getAddress(CREATOR_HUB_ADDR as Address) as Address) : null; }
    catch { return null; }
  }, []);

  const creatorAddrNorm: Address | null = useMemo(() => {
    try { return creatorAddress && isAddress(creatorAddress) ? (getAddress(creatorAddress) as Address) : null; }
    catch { return null; }
  }, [creatorAddress]);

  // viem multicall wrapper returning `results`
  const mc = useCallback(
    async (contracts: any[]) => {
      if (!pub || !contracts.length) return [] as any[];
      const { results } = await (pub as any).multicall({ contracts });
      return results as any[];
    },
    [pub]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setPlans(null);
    setPosts(null);
    setTokenMeta({});
    setSubActive(false);
    setUnlockedPosts({});

    try {
      if (!pub) throw new Error('Public client unavailable');
      if (!creatorAddrNorm) { setPlans([]); setPosts([]); return; }
      if (!hubAddr || /^0x0{40}$/i.test(hubAddr.slice(2))) throw new Error('CreatorHub address not configured');

      // 1) ids
      const [planIds, postIds] = await Promise.all([
        pub.readContract({ address: hubAddr, abi: CREATOR_HUB_ABI as Abi, functionName: 'getCreatorPlanIds', args: [creatorAddrNorm] }) as Promise<bigint[]>,
        pub.readContract({ address: hubAddr, abi: CREATOR_HUB_ABI as Abi, functionName: 'getCreatorPostIds', args: [creatorAddrNorm] }) as Promise<bigint[]>,
      ]);

      // 2) structs
      const [planRes, postRes] = await Promise.all([
        mc(planIds.map((id) => ({ address: hubAddr, abi: CREATOR_HUB_ABI as Abi, functionName: 'plans' as const, args: [id] }))),
        mc(postIds.map((id) => ({ address: hubAddr, abi: CREATOR_HUB_ABI as Abi, functionName: 'posts' as const, args: [id] }))),
      ]);

      const plansParsed: Plan[] = planIds.map((id, i) => {
        const r: any = planRes[i]?.result ?? [];
        return {
          id,
          token: (r[1] || '0x0000000000000000000000000000000000000000') as Address,
          pricePerPeriod: BigInt(r[2] ?? 0n),
          periodDays: Number(r[3] ?? 0),
          active: Boolean(r[4]),
          name: String(r[5] ?? ''),
          metadataURI: String(r[6] ?? ''),
        };
      });

      const postsParsed: Post[] = postIds.map((id, i) => {
        const r: any = postRes[i]?.result ?? [];
        return {
          id,
          token: (r[1] || '0x0000000000000000000000000000000000000000') as Address,
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

      // 3) token meta
      const uniqueTokens = Array.from(new Set(
        [...activePlans.map((p) => p.token), ...activePosts.map((p) => p.token)].filter((a) => isAddress(a))
      )) as Address[];

      if (uniqueTokens.length) {
        const [decRes, symRes] = await Promise.all([
          mc(uniqueTokens.map((t) => ({ address: t, abi: ERC20_MINI_ABI, functionName: 'decimals' as const }))),
          mc(uniqueTokens.map((t) => ({ address: t, abi: ERC20_MINI_ABI, functionName: 'symbol' as const }))),
        ]);
        const meta: Record<string, TokenMeta> = {};
        uniqueTokens.forEach((t, i) => {
          const dec = Number(decRes[i]?.result ?? 18);
          const sym = symRes[i]?.result as string | undefined;
          meta[t.toLowerCase()] = { decimals: Number.isFinite(dec) ? dec : 18, symbol: sym || undefined };
        });
        setTokenMeta(meta);
      }

      // 4) gating checks for current wallet
      if (isConnected && userAddr) {
        const user = getAddress(userAddr);

        // subscription
        try {
          const subRes = await fetch('/api/gate', {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ mode: 'sub', user, creator: creatorAddrNorm }),
            cache: 'no-store',
          });
          const subJson = await subRes.json().catch(() => ({}));
          setSubActive(Boolean(subJson?.allowed));
        } catch { setSubActive(false); }

        // posts
        const ids = activePosts.map((p) => p.id);
        const results = await pMap(ids, 4, async (pid) => {
          try {
            const res = await fetch('/api/gate', {
              method: 'POST',
              headers: { 'content-type': 'application/json', accept: 'application/json' },
              body: JSON.stringify({ mode: 'post', user, postId: String(pid) }),
              cache: 'no-store',
            });
            const j = await res.json().catch(() => ({}));
            return { id: pid, ok: Boolean(j?.allowed) };
          } catch { return { id: pid, ok: false }; }
        });
        const map: Record<string, boolean> = {};
        results.forEach((r) => (map[r.id.toString()] = r.ok));
        setUnlockedPosts(map);
      } else {
        setSubActive(false);
        setUnlockedPosts({});
      }
    } catch (e: any) {
      setErr(e?.message || 'Failed to load on-chain data');
      setPlans([]);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [pub, creatorAddrNorm, hubAddr, isConnected, userAddr, mc]);

  useEffect(() => {
    let alive = true;
    (async () => { if (alive) await load(); })();
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

  const hasWallet = Boolean(creatorAddrNorm);
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
          <button onClick={load} className="inline-flex items-center gap-1 rounded-lg border border-rose-300/30 px-2.5 py-1.5 text-xs hover:bg-rose-400/10">
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
                  <div className="truncate font-medium" title={p.name || 'Plan'}>{p.name || 'Plan'}</div>
                  <div className="whitespace-nowrap text-sm text-slate-300">{fmtAmount(p.pricePerPeriod, p.token)} / {p.periodDays}d</div>
                </div>
                {p.metadataURI ? (
                  <div className="mt-2 line-clamp-2 text-sm text-slate-300" title={p.metadataURI}>{p.metadataURI}</div>
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
              const hasPost = !!unlockedPosts[p.id.toString()];
              const viaSub = p.accessViaSub && subActive;
              const isUnlocked = hasPost || viaSub;

              const displaySrc = isUnlocked ? base : (previewUri || base);
              const shouldBlur = !isUnlocked && !previewUri && blur;

              return (
                <article key={String(p.id)} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="relative">
                    <div className={`relative ${shouldBlur ? 'blur-lg select-none' : ''}`}>
                      <SafeMedia src={displaySrc} className="aspect-video w-full overflow-hidden" rounded="rounded-lg" />
                    </div>
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide">Locked</span>
                      </div>
                    )}
                  </div>

                  <span className="sr-only">{p.uri}</span>

                  <div className="mt-2 text-xs text-slate-400">
                    {fmtAmount(p.price, p.token)}{p.accessViaSub ? ' • also via subscription' : ''}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {!isUnlocked && <BuyPostButton postId={p.id} />}
                    {p.accessViaSub ? (
                      <span className="text-[11px] text-slate-400">
                        {subActive ? 'Unlocked via subscription' : 'Subscribers unlock automatically'}
                      </span>
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
