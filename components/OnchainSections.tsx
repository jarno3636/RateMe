// components/OnchainSections.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Loader2, Lock, Unlock, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatorHub } from '@/hooks/useCreatorHub';
import { useGate } from '@/hooks/useGate';
import { toChecksum } from '@/lib/gate';

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

function msFromSecondsOrMs(v: number): number {
  // treat values below ~Jan 2002 as seconds; convert to ms
  return v > 1e12 ? v : v * 1000;
}

export default function OnchainSections({ creatorAddress }: { creatorAddress: `0x${string}` }) {
  const { address } = useAccount();
  const eoa = useMemo(() => (address ? toChecksum(address) : null), [address]);
  const { checkPost, checkSub } = useGate();

  const {
    getCreatorPlanIds,
    getCreatorPostIds,
    readPlan,
    readPost,
    subscribe,
    buyPost,
    hasPostAccess, // on-chain view (used as warm cache/fallback)
    isActive,      // on-chain view (used as warm cache/fallback)
    previewSubscribeTotal,
    previewBuyPost,
    getSubExpiry,
  } = useCreatorHub();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [subActive, setSubActive] = useState<boolean>(false);
  const [subExpiryMs, setSubExpiryMs] = useState<number | null>(null);
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

      const nextPlans = planRows
        .map((r, i) => (r ? ({ id: planIds[i], ...r } as Plan) : null))
        .filter(Boolean) as Plan[];

      const nextPosts = postRows
        .map((r, i) => (r ? ({ id: postIds[i], ...r } as Post) : null))
        .filter(Boolean) as Post[];

      setPlans(nextPlans);
      setPosts(nextPosts);

      // subscription status
      if (eoa) {
        // quick on-chain check to make the UI responsive
        const active = await isActive(eoa, creatorAddress).catch(() => false);
        setSubActive(!!active);

        const rawUntil = await getSubExpiry(eoa, creatorAddress).catch(() => 0);
        setSubExpiryMs(rawUntil ? msFromSecondsOrMs(Number(rawUntil)) : null);

        // best-effort warm the access cache for posts (on-chain view)
        const entries = await Promise.all(
          postIds.map(async (pid) => {
            const ok = await hasPostAccess(eoa, pid).catch(() => false);
            return [pid.toString(), ok] as const;
          })
        );
        const warm: Record<string, boolean> = {};
        for (const [k, v] of entries) warm[k] = v;
        setAccessCache(warm);
      } else {
        setSubActive(false);
        setSubExpiryMs(null);
        setAccessCache({});
      }
    } finally {
      setLoading(false);
    }
  }, [
    eoa,
    creatorAddress,
    getCreatorPlanIds,
    getCreatorPostIds,
    readPlan,
    readPost,
    isActive,
    getSubExpiry,
    hasPostAccess,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Authoritative gated status via signed API (memoized in lib/gate)
  const verifySubNow = useCallback(async () => {
    if (!eoa) return false;
    try {
      const ok = await checkSub(creatorAddress);
      setSubActive(ok);
      return ok;
    } catch {
      return false;
    }
  }, [eoa, creatorAddress, checkSub]);

  async function doSubscribe(plan: Plan) {
    try {
      if (!eoa) {
        toast.error('Connect wallet');
        return;
      }
      setBusyId(`plan:${plan.id.toString()}`);
      const total = await previewSubscribeTotal(plan.id, 1);
      toast(`Approval + subscribe${total > 0n ? ` (${fmtUSDC(total)} USDC)…` : '…'}`, { icon: '⛓️' });
      await subscribe(plan.id, 1);
      toast.success('Subscribed');
      // verify via gate & refresh UI
      await verifySubNow();
      await refresh();
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Failed to subscribe');
    } finally {
      setBusyId(null);
    }
  }

  async function doBuy(post: Post) {
    try {
      if (!eoa) {
        toast.error('Connect wallet');
        return;
      }
      setBusyId(`post:${post.id.toString()}`);
      const total = await previewBuyPost(post.id);
      if (total > 0n) toast(`Approval + buy (${fmtUSDC(total)} USDC)…`, { icon: '⛓️' });
      await buyPost(post.id);
      toast.success('Unlocked');

      // double check via gate endpoint (handles both purchase & sub-unlock)
      const ok = await checkPost(post.id);
      setAccessCache((m) => ({ ...m, [post.id.toString()]: ok }));
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

  // Only show active plans by default
  const visiblePlans = plans.filter((p) => p.active);

  return (
    <section className="space-y-6">
      {/* Subscription plans */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Subscription</div>
          {eoa && (
            <div className="text-xs text-slate-400">
              {subActive ? (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <Unlock className="h-3.5 w-3.5" /> Active
                  {subExpiryMs ? (
                    <span className="text-slate-400 ml-1">
                      until {new Date(subExpiryMs).toLocaleDateString()}
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
        {!visiblePlans.length ? (
          <p className="mt-2 text-sm text-slate-400">No plans yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {visiblePlans.map((p) => {
              const key = p.id.toString();
              const disabled = !eoa || busyId === `plan:${key}` || subActive;
              return (
                <li key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.name || 'Plan'}</div>
                      <div className="text-xs text-slate-400">
                        {fmtUSDC(p.pricePerPeriod)} USDC / {p.periodDays}d
                      </div>
                    </div>
                    <button
                      onClick={() => doSubscribe(p)}
                      disabled={disabled}
                      className="btn-secondary inline-flex items-center text-xs disabled:opacity-60"
                    >
                      {busyId === `plan:${key}` ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CreditCard className="mr-1 h-3.5 w-3.5" />
                      )}
                      {subActive ? 'Already active' : 'Subscribe'}
                    </button>
                  </div>
                </li>
              );
            })}
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

              // authoritative unlock state: local cache OR sub unlock OR free
              const unlocked =
                accessCache[k] || (subActive && p.accessViaSub) || p.price === 0n;

              const buying = busyId === `post:${k}`;
              const disabled = !eoa || buying;

              // Decide how to render media
              const isVideo = /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(hints.base);
              const showPreview = !unlocked && !!hints.preview;

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
                      isVideo ? (
                        <video
                          src={hints.base}
                          controls
                          playsInline
                          className="w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={hints.base} className="w-full object-cover" alt="" />
                      )
                    ) : showPreview ? (
                      isVideo ? (
                        <video
                          src={hints.preview}
                          className={`w-full object-cover ${hints.blur ? 'blur-md' : ''}`}
                          controls={false}
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={hints.preview}
                          className={`w-full object-cover ${hints.blur ? 'blur-md' : ''}`}
                          alt=""
                        />
                      )
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
                        disabled={disabled}
                        className="btn inline-flex items-center text-xs disabled:opacity-60"
                      >
                        {buying ? (
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
