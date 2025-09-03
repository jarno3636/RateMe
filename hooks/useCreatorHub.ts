// hooks/useCreatorHub.ts
import { useCallback } from 'react';
import { Address, erc20Abi, parseUnits } from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { CREATOR_HUB, CREATOR_HUB_ABI } from '@/lib/creatorHub';

type Plan = {
  creator: Address; token: Address; pricePerPeriod: bigint; periodDays: number;
  active: boolean; name: string; metadataURI: string;
}
type Post = {
  creator: Address; token: Address; price: bigint;
  active: boolean; accessViaSub: boolean; uri: string;
}

const ZERO: Address = '0x0000000000000000000000000000000000000000';

export function useCreatorHub() {
  const { address } = useAccount();
  const { data: wallet } = useWalletClient();
  const pub = usePublicClient();

  const readPlan = useCallback(async (id: bigint) => {
    const p = await pub.readContract({ address: CREATOR_HUB, abi: CREATOR_HUB_ABI, functionName: 'plans', args: [id] }) as any;
    const plan: Plan = {
      creator: p[0], token: p[1], pricePerPeriod: p[2],
      periodDays: Number(p[3]), active: p[4], name: p[5], metadataURI: p[6],
    };
    return plan;
  }, [pub]);

  const readPost = useCallback(async (id: bigint) => {
    const p = await pub.readContract({ address: CREATOR_HUB, abi: CREATOR_HUB_ABI, functionName: 'posts', args: [id] }) as any;
    const post: Post = {
      creator: p[0], token: p[1], price: p[2],
      active: p[3], accessViaSub: p[4], uri: p[5],
    };
    return post;
  }, [pub]);

  // Approve ERC20 if needed
  const ensureAllowance = useCallback(async (token: Address, owner: Address, spender: Address, needed: bigint) => {
    const allowance = await pub.readContract({
      address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, spender],
    }) as bigint;
    if (allowance >= needed) return;
    const hash = await wallet!.writeContract({
      address: token, abi: erc20Abi, functionName: 'approve', args: [spender, needed],
    });
    await pub.waitForTransactionReceipt({ hash });
  }, [pub, wallet]);

  // Subscribe: ETH (value) or ERC20 (approve)
  const subscribe = useCallback(async (planId: bigint, periods: number) => {
    if (!wallet || !address) throw new Error('Connect wallet');
    const plan = await readPlan(planId);
    const total = plan.pricePerPeriod * BigInt(periods);

    if (plan.token === ZERO) {
      const sim = await pub.simulateContract({
        address: CREATOR_HUB, abi: CREATOR_HUB_ABI, functionName: 'subscribe',
        args: [planId, periods], account: wallet.account!, value: total,
      });
      const hash = await wallet.writeContract(sim.request);
      return pub.waitForTransactionReceipt({ hash });
    } else {
      await ensureAllowance(plan.token, address, CREATOR_HUB, total);
      const sim = await pub.simulateContract({
        address: CREATOR_HUB, abi: CREATOR_HUB_ABI, functionName: 'subscribe',
        args: [planId, periods], account: wallet.account!,
      });
      const hash = await wallet.writeContract(sim.request);
      return pub.waitForTransactionReceipt({ hash });
    }
  }, [address, ensureAllowance, pub, readPlan, wallet]);

  // Buy post: ETH (value) or ERC20 (approve)
  const buyPost = useCallback(async (postId: bigint) => {
    if (!wallet || !address) throw new Error('Connect wallet');
    const post = await readPost(postId);

    if (post.token === ZERO) {
      const sim = await pub.simulateContract({
        address: CREATOR_HUB, abi: CREATOR_HUB_ABI, functionName: 'buyPost',
        args: [postId], account: wallet.account!, value: post.price,
      });
      const hash = await wallet.writeContract(sim.request);
      return pub.waitForTransactionReceipt({ hash });
    } else {
      await ensureAllowance(post.token, address, CREATOR_HUB, post.price);
      const sim = await pub.simulateContract({
        address: CREATOR_HUB, abi: CREATOR_HUB_ABI, functionName: 'buyPost',
        args: [postId], account: wallet.account!,
      });
      const hash = await wallet.writeContract(sim.request);
      return pub.waitForTransactionReceipt({ hash });
    }
  }, [address, ensureAllowance, pub, readPost, wallet]);

  // Creator helpers
  const createPlan = useCallback(async (params: {
    token: Address; pricePerPeriod: bigint; periodDays: number; name: string; metadataURI: string;
  }) => {
    if (!wallet) throw new Error('Connect wallet');
    const sim = await pub.simulateContract({
      address: CREATOR_HUB, abi: CREATOR_HUB_ABI, functionName: 'createPlan',
      args: [params.token, params.pricePerPeriod, params.periodDays, params.name, params.metadataURI],
      account: wallet.account!,
    });
    const hash = await wallet.writeContract(sim.request);
    return pub.waitForTransactionReceipt({ hash });
  }, [pub, wallet]);

  const createPost = useCallback(async (params: {
    token: Address; price: bigint; accessViaSub: boolean; uri: string;
  }) => {
    if (!wallet) throw new Error('Connect wallet');
    const sim = await pub.simulateContract({
      address: CREATOR_HUB, abi: CREATOR_HUB_ABI, functionName: 'createPost',
      args: [params.token, params.price, params.accessViaSub, params.uri],
      account: wallet.account!,
    });
    const hash = await wallet.writeContract(sim.request);
    return pub.waitForTransactionReceipt({ hash });
  }, [pub, wallet]);

  return {
    readPlan, readPost, subscribe, buyPost, createPlan, createPost,
  };
}
