// hooks/useCreatorHub.ts
'use client';

import { useCallback } from 'react';
import type { Address, Abi } from 'viem';
import { erc20Abi } from 'viem';
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
} from 'wagmi';
import { CREATOR_HUB_ADDR, CREATOR_HUB_ABI, BASE_CHAIN_ID } from '@/lib/creatorHub';

export type Plan = {
  creator: Address;
  token: Address;
  pricePerPeriod: bigint;
  periodDays: number;
  active: boolean;
  name: string;
  metadataURI: string;
};

export type Post = {
  creator: Address;
  token: Address;
  price: bigint;
  active: boolean;
  accessViaSub: boolean;
  uri: string;
};

const HUB_ADDR = CREATOR_HUB_ADDR as Address;
const HUB_ABI = CREATOR_HUB_ABI as Abi;
const ZERO: Address = '0x0000000000000000000000000000000000000000';

function req<T>(v: T | undefined, msg: string): T {
  if (v === undefined || v === null) throw new Error(msg);
  return v as T;
}

export function useCreatorHub() {
  const { address, chainId } = useAccount();

  // Pin reads/sims to Base
  const pubBase = usePublicClient({ chainId: BASE_CHAIN_ID });
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  // ---------- guards ----------
  const assertPub = () => req(pubBase, 'Public client unavailable');
  const assertWallet = () => req(wallet, 'Connect wallet');
  const assertHubAddr = () => {
    if (!HUB_ADDR || HUB_ADDR === ZERO) throw new Error('CreatorHub address not configured');
  };

  const ensureBase = useCallback(async () => {
    assertWallet();
    if (chainId !== BASE_CHAIN_ID) {
      await switchChainAsync?.({ chainId: BASE_CHAIN_ID });
    }
  }, [chainId, switchChainAsync]);

  // Generic simulate → write → wait (always against Base)
  const send = useCallback(
    async <TArgs extends unknown[]>(
      fn: keyof any,
      args: TArgs,
      opts?: { value?: bigint }
    ) => {
      assertHubAddr();
      await ensureBase();
      const _pub = assertPub();
      const _wal = assertWallet();

      const { request } = await _pub.simulateContract({
        address: HUB_ADDR,
        abi: HUB_ABI,
        functionName: fn as any,
        args: args as any,
        account: _wal.account,
        value: opts?.value,
        chain: _pub.chain,
      });

      const hash = await _wal.writeContract(request);
      return _pub.waitForTransactionReceipt({ hash });
    },
    [ensureBase]
  );

  // ---------- Reads (pinned to Base) ----------
  const readPlan = useCallback(async (id: bigint): Promise<Plan> => {
    assertHubAddr();
    const _pub = assertPub();
    const p = (await _pub.readContract({
      address: HUB_ADDR,
      abi: HUB_ABI,
      functionName: 'plans',
      args: [id],
    })) as unknown as [Address, Address, bigint, bigint, boolean, string, string];

    return {
      creator: p[0],
      token: p[1],
      pricePerPeriod: p[2],
      periodDays: Number(p[3]),
      active: p[4],
      name: p[5],
      metadataURI: p[6],
    };
  }, []);

  const readPost = useCallback(async (id: bigint): Promise<Post> => {
    assertHubAddr();
    const _pub = assertPub();
    const p = (await _pub.readContract({
      address: HUB_ADDR,
      abi: HUB_ABI,
      functionName: 'posts',
      args: [id],
    })) as unknown as [Address, Address, bigint, boolean, boolean, string];

    return {
      creator: p[0],
      token: p[1],
      price: p[2],
      active: p[3],
      accessViaSub: p[4],
      uri: p[5],
    };
  }, []);

  const hasPostAccess = useCallback(async (user: Address, postId: bigint) => {
    assertHubAddr();
    const _pub = assertPub();
    return (await _pub.readContract({
      address: HUB_ADDR,
      abi: HUB_ABI,
      functionName: 'hasPostAccess',
      args: [user, postId],
    })) as boolean;
  }, []);

  const isActive = useCallback(async (user: Address, creator: Address) => {
    assertHubAddr();
    const _pub = assertPub();
    return (await _pub.readContract({
      address: HUB_ADDR,
      abi: HUB_ABI,
      functionName: 'isActive',
      args: [user, creator],
    })) as boolean;
  }, []);

  const getCreatorPlanIds = useCallback(async (creator: Address) => {
    assertHubAddr();
    const _pub = assertPub();
    return (await _pub.readContract({
      address: HUB_ADDR,
      abi: HUB_ABI,
      functionName: 'getCreatorPlanIds',
      args: [creator],
    })) as bigint[];
  }, []);

  const getCreatorPostIds = useCallback(async (creator: Address) => {
    assertHubAddr();
    const _pub = assertPub();
    return (await _pub.readContract({
      address: HUB_ADDR,
      abi: HUB_ABI,
      functionName: 'getCreatorPostIds',
      args: [creator],
    })) as bigint[];
  }, []);

  /**
   * getSubExpiry: returns a millisecond timestamp when the viewer’s subscription
   * to `creator` expires, or 0 if not subscribed. Tries several common ABI shapes:
   *   - subExpiries(user, creator) -> uint256
   *   - getSubExpiry(user, creator) -> uint256
   *   - subscriptionExpiry(user, creator) -> uint256
   *   - subscriptions(user, creator) -> (expiry, ...) or uint256
   */
  const getSubExpiry = useCallback(
    async (creator: Address, user?: Address): Promise<number> => {
      assertHubAddr();
      const _pub = assertPub();
      const u = (user || address) as Address | undefined;
      if (!u) return 0;

      const candidates: Array<{ fn: string; tupleFirst?: boolean }> = [
        { fn: 'subExpiries' },
        { fn: 'getSubExpiry' },
        { fn: 'subscriptionExpiry' },
        { fn: 'subscriptions', tupleFirst: true }, // might return struct/tuple
      ];

      for (const c of candidates) {
        try {
          const res = (await _pub.readContract({
            address: HUB_ADDR,
            abi: HUB_ABI,
            functionName: c.fn as any,
            args: [u, creator],
          })) as unknown;

          // Unwrap possible tuple/struct (expiry first)
          const raw =
            c.tupleFirst && Array.isArray(res) ? (res as any)[0] : (res as any);

          // Convert bigint/number/string → number (ms)
          let ts = 0;
          if (typeof raw === 'bigint') ts = Number(raw);
          else if (typeof raw === 'number') ts = raw;
          else if (typeof raw === 'string') ts = Number(raw);

          if (!Number.isFinite(ts) || ts <= 0) continue;

          // Heuristic: if seconds (< 10^12), convert to ms
          if (ts < 1_000_000_000_000) ts = ts * 1000;

          return ts;
        } catch {
          // try next candidate
        }
      }
      return 0;
    },
    [address]
  );

  // ---------- ERC20 helper (pinned to Base) ----------
  const ensureAllowance = useCallback(
    async (token: Address, owner: Address, spender: Address, needed: bigint, opts?: { infinite?: boolean }) => {
      if (token === ZERO) return; // native token: no allowance
      const _pub = assertPub();
      const _wal = assertWallet();

      const current = (await _pub.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender],
      })) as bigint;
      if (current >= needed) return;

      const amount = opts?.infinite ? (2n ** 256n - 1n) : needed;

      const { request } = await _pub.simulateContract({
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amount],
        account: _wal.account,
        chain: _pub.chain,
      });
      const hash = await _wal.writeContract(request);
      await _pub.waitForTransactionReceipt({ hash });
    },
    []
  );

  // ---------- Writes ----------
  const subscribe = useCallback(
    async (planId: bigint, periods: number) => {
      assertHubAddr();
      const _addr = req(address, 'Connect wallet');
      const plan = await readPlan(planId);
      const n = Math.max(1, Math.floor(Number(periods || 1)));
      const total = plan.pricePerPeriod * BigInt(n);

      if (plan.token === ZERO) {
        return send('subscribe', [planId, n], { value: total });
      } else {
        await ensureAllowance(plan.token, _addr, HUB_ADDR, total, { infinite: true });
        return send('subscribe', [planId, n]);
      }
    },
    [address, readPlan, ensureAllowance, send]
  );

  const buyPost = useCallback(
    async (postId: bigint) => {
      assertHubAddr();
      const _addr = req(address, 'Connect wallet');
      const post = await readPost(postId);

      if (post.token === ZERO) {
        return send('buyPost', [postId], { value: post.price });
      } else {
        await ensureAllowance(post.token, _addr, HUB_ADDR, post.price, { infinite: true });
        return send('buyPost', [postId]);
      }
    },
    [address, readPost, ensureAllowance, send]
  );

  const createPlan = useCallback(
    async (p: {
      token: Address;
      pricePerPeriod: bigint;
      periodDays: number;
      name: string;
      metadataURI: string;
    }) => send('createPlan', [p.token, p.pricePerPeriod, p.periodDays, p.name, p.metadataURI]),
    [send]
  );

  const createPost = useCallback(
    async (p: { token: Address; price: bigint; accessViaSub: boolean; uri: string }) =>
      send('createPost', [p.token, p.price, p.accessViaSub, p.uri]),
    [send]
  );

  const cancelSubscription = useCallback(async (creator: Address) => {
    return send('cancelSubscription', [creator]);
  }, [send]);

  // ---------- Optional UI helpers ----------
  const previewSubscribeTotal = useCallback(async (planId: bigint, periods: number) => {
    const plan = await readPlan(planId);
    const n = Math.max(1, Math.floor(Number(periods || 1)));
    return { token: plan.token, total: plan.pricePerPeriod * BigInt(n) };
  }, [readPlan]);

  const previewBuyPost = useCallback(async (postId: bigint) => {
    const post = await readPost(postId);
    return { token: post.token, total: post.price };
  }, [readPost]);

  return {
    // reads
    readPlan,
    readPost,
    hasPostAccess,
    isActive,
    getCreatorPlanIds,
    getCreatorPostIds,
    getSubExpiry, // ← added
    // writes
    subscribe,
    buyPost,
    createPlan,
    createPost,
    cancelSubscription,
    // helpers
    previewSubscribeTotal,
    previewBuyPost,
  };
}
