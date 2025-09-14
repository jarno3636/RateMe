'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Loader2, Lock, Unlock, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatorHub } from '@/hooks/useCreatorHub';

type Plan = {
  id: bigint;
  creator: `0x${string}`;
  token: `0x${string}`;
  pricePerPeriod: bigint; // 6dp USDC
  periodDays: number;
  active: boolean;
  name: string;
  metadataURI: string;
};

type Post = {
  id: bigint;
  creator: `0x${string}`;
  token: `0x${string}`;
  price: bigint; // 6dp USDC
  active: boolean;
  accessViaSub: boolean;
  uri: string;
};

function fmtUSDC(x: bigint) {
  const n = Number(x) / 1e6;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseHints(uri: string) {
  try {
    const [base, frag] = uri.split('#');
    const sp = new URLSearchParams(frag || '');
    const preview = sp.get('rm_preview') || '';
    const blur = sp.get('rm_blur') === '1';
    return { base, preview, blur };
  } catch {
    return { base: uri, preview: '', blur: false };
  }
}

export default function OnchainSections({ creatorAddress }: { creatorAddress: `0x${string}` }) {
  const { address } = useAccount();
  const {
    getCreatorPlanIds,
    getCreatorPostIds,
    readPlan,
    readPost,
    subscribe,
    buyPost,
    hasPostAccess,
    isActive,
    previewSubscribeTotal,
    previewBuyPost,
    getSubExpiry,
  } = useCreatorHub();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [subActive, setSubActive] = useState<boolean>(false);
  const [subExpiry, setSubExpiry] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [accessCache, setAccessCache] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [planIds, postIds] = await Promise.all([
        getCreatorPlanIds(creatorAddress),
        getCreatorPostIds(creatorAddress),
      ]);

      const [planRows, postRows] = await Promise.all([
        Promise.all(planIds.map((id) => readPlan(id))),
        Promise.all(postIds.map((id) => readPost(id))),
      ]);

      setPlans(
        planRows
          .map((r, i) => (r ? { id: planIds[i], ...r } as Plan : null))
          .filter(Boolean) as Plan[]
      );

      setPosts(
        postRows
          .map((r, i) => (r ? { id: postIds[i], ...r } as Post : null))
          .filter(Boolean) as Post[]
      );

      if (address) {
        const active = await isActive(address, creatorAddress);
        setSubActive(active);
        const until = await getSubExpiry(address, creatorAddress).catch(() => 0);
        setSubExpiry(until > 0 ? until : null);

        // prefill access cache for posts (optional best-effort)
        const entries = await Promise.all(
          postIds.map(async (pid) => [pid.toString(), await hasPostAccess(address, pid)] as const)
        );
        const next: Record<string, boolean> = {};
        for (const [k, v] of entries) next[k] = v;
        setAccessCache(next);
      } else {
        setSubActive(false);
        setSubExpiry(null);
        setAccessCache({});
      }
    } finally {
      setLoading(false);
    }
  }, [address, creatorAddress, getCreatorPlanIds, getCreatorPostIds, readPlan, readPost, isActive, getSubExpiry, hasPostAccess]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function doSubscribe(plan: Plan) {
    try {
      setBusyId(`plan:${plan.id.toString()}`);
      const total = await previewSubscribeTotal(plan.id, 1);
      toast(`Approval + subscribe (${fmtUSDC(total)} USDC)…`, { icon: '⛓️' });
      await subscribe(plan.id, 1);
      toast.success('Subscribed');
      await refresh();
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Failed to subscribe');
    } finally {
      setBusyId(null);
    }
  }

  async function doBuy(post: Post) {
    try {
      setBusyId(`post:${post.id.toString()}`);
      const total = await previewBuyPost(post.id);
      if (total > 0n) toast(`Approval + buy (${fmtUSDC(total)} USDC)…`, { icon: '⛓️' });
      await buyPost(post.id);
      toast.success('Unlocked');
      if (address) {
        const ok = await hasPostAccess(address, post.id);
        setAccessCache((m) => ({ ...m, [post.id.toString()]: ok }));
      }
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Failed to buy');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading on-chain content…
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Subscription plans */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Subscription</div>
          {address && (
            <div className="text-xs text-slate-400">
              {subActive ? (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <Unlock className="h-3.5 w-3.5" /> Active
                  {subExpiry ? (
                    <span className="text-slate-400 ml-1">
                      until {new Date(subExpiry).toLocaleDateString()}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-300">
                  <Lock className="h-3.5 w-3.5" /> Not active
                </span>
              )}
            </div>
          )}
        </div>
        {!plans.length ? (
          <p className="mt-2 text-sm text-slate-400">No plans yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <li key={p.id.toString()} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name || 'Plan'}</div>
                    <div className="text-xs text-slate-400">
                      {fmtUSDC(p.pricePerPeriod)} USDC / {p.periodDays}d
                    </div>
                  </div>
                  <button
                    onClick={() => doSubscribe(p)}
                    disabled={!address || busyId === `plan:${p.id.toString()}`}
                    className="btn-secondary inline-flex items-center text-xs disabled:opacity-60"
                  >
                    {busyId === `plan:${p.id.toString()}` ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="mr-1 h-3.5 w-3.5" />
                    )}
                    Subscribe
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Posts */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium">Posts</div>
        {!posts.length ? (
          <p className="mt-2 text-sm text-slate-400">No posts yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {posts.map((p) => {
              const k = p.id.toString();
              const hints = parseHints(p.uri);
              const unlocked = accessCache[k] || (subActive && p.accessViaSub) || p.price === 0n;

              return (
                <li key={k} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      #{k} • {p.accessViaSub ? 'Sub unlock' : 'One-off'}
                    </div>
                    {!unlocked && (
                      <div className="text-xs text-slate-300">{fmtUSDC(p.price)} USDC</div>
                    )}
                  </div>

                  <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
                    {unlocked ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={hints.base} className="w-full object-cover" alt="" />
                    ) : hints.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={hints.preview}
                        className={`w-full object-cover ${hints.blur ? 'blur-md' : ''}`}
                        alt=""
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
                        Locked
                      </div>
                    )}
                  </div>

                  {!unlocked && (
                    <div className="mt-2">
                      <button
                        onClick={() => doBuy(p)}
                        disabled={!address || busyId === `post:${k}`}
                        className="btn inline-flex items-center text-xs disabled:opacity-60"
                      >
                        {busyId === `post:${k}` ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="mr-1 h-3.5 w-3.5" />
                        )}
                        Buy to unlock
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
