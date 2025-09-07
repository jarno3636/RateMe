// components/OnchainSections.tsx
'use client';

import { useEffect, useState } from 'react';
import { Address } from 'viem';
import { usePublicClient } from 'wagmi';
import { CREATOR_HUB_ABI, CREATOR_HUB_ADDR } from '@/lib/creatorHub';
import SubscribeButton from './SubscribeButton';
import BuyPostButton from './BuyPostButton';

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

export default function OnchainSections({ creatorAddress }: { creatorAddress?: Address | null }) {
  const pub = usePublicClient();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    (async () => {
      if (!creatorAddress) { setPlans([]); setPosts([]); return; }

      const planIds = await (pub as any).readContract({
        address: CREATOR_HUB_ADDR, abi: CREATOR_HUB_ABI as any,
        functionName: 'getCreatorPlanIds',
        args: [creatorAddress],
      }) as bigint[];

      const postIds = await (pub as any).readContract({
        address: CREATOR_HUB_ADDR, abi: CREATOR_HUB_ABI as any,
        functionName: 'getCreatorPostIds',
        args: [creatorAddress],
      }) as bigint[];

      const planReads = await Promise.all(planIds.map(async (id) => {
        const p = await (pub as any).readContract({
          address: CREATOR_HUB_ADDR, abi: CREATOR_HUB_ABI as any, functionName: 'plans', args: [id]
        });
        return {
          id,
          token: p[1],
          pricePerPeriod: p[2],
          periodDays: Number(p[3]),
          active: p[4],
          name: p[5],
          metadataURI: p[6],
        } as Plan;
      }));

      const postReads = await Promise.all(postIds.map(async (id) => {
        const p = await (pub as any).readContract({
          address: CREATOR_HUB_ADDR, abi: CREATOR_HUB_ABI as any, functionName: 'posts', args: [id]
        });
        return {
          id,
          token: p[1],
          price: p[2],
          active: p[3],
          accessViaSub: p[4],
          uri: p[5],
        } as Post;
      }));

      setPlans(planReads.filter((p) => p.active));
      setPosts(postReads.filter((p) => p.active));
    })().catch(() => {
      setPlans([]); setPosts([]);
    });
  }, [creatorAddress, pub]);

  const fmt = (n: bigint) => Number(n) / 1e6; // display helper if using 6-decimals; actual token decimals vary

  return (
    <div className="space-y-8">
      {/* Plans */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subscription Plans</h2>
        {!plans ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : !plans.length ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {creatorAddress ? 'No active plans.' : 'Creator has not linked a wallet address yet.'}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <div key={String(p.id)} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.name || 'Plan'}</div>
                  <div className="text-sm text-slate-300">
                    {fmt(p.pricePerPeriod)} / {p.periodDays}d
                  </div>
                </div>
                {p.metadataURI ? (
                  <div className="mt-2 text-sm text-slate-300 line-clamp-2">{p.metadataURI}</div>
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
        {!posts ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : !posts.length ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {creatorAddress ? 'No active paid posts.' : 'Creator has not linked a wallet address yet.'}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <article key={String(p.id)} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900" />
                <div className="mt-2 text-sm font-medium line-clamp-1">{p.uri || `Post #${p.id}`}</div>
                <div className="text-xs text-slate-400">{fmt(p.price)} {p.accessViaSub ? '• also via subscription' : ''}</div>
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
