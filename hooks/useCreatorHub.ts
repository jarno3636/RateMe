// hooks/useCreatorHub.ts
'use client';

import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import type { Address } from 'viem';
import { CREATOR_HUB_ABI } from '@/lib/creatorHub/abi';
import { CREATOR_HUB_ADDRESS, hubConfigured } from '@/lib/profileRegistry/constants';

export function useCreatorHub() {
  const { data: wallet } = useWalletClient();
  const pub = usePublicClient();
  const { address } = useAccount();

  async function write<T extends string>(
    fn: T,
    args: any[] = [],
    overrides?: { value?: bigint }
  ) {
    if (!hubConfigured) throw new Error('CreatorHub not configured');
    if (!wallet) throw new Error('Connect a wallet');

    const hash = await wallet.writeContract({
      address: CREATOR_HUB_ADDRESS as Address,
      abi: CREATOR_HUB_ABI,
      functionName: fn as any,
      args,
      ...(overrides?.value ? { value: overrides.value } : {}),
      chain: pub?.chain,
    } as any);

    return hash;
  }

  async function read<T extends string>(fn: T, args: any[] = []) {
    if (!hubConfigured) throw new Error('CreatorHub not configured');
    return pub.readContract({
      address: CREATOR_HUB_ADDRESS as Address,
      abi: CREATOR_HUB_ABI,
      functionName: fn as any,
      args,
    } as any);
  }

  // --------- writes
  async function createPlan(input: {
    token: Address;
    pricePerPeriod: bigint;
    periodDays: number;
    name: string;
    metadataURI: string;
  }) {
    return write('createPlan', [
      input.token,
      input.pricePerPeriod,
      BigInt(input.periodDays),
      input.name,
      input.metadataURI,
    ]);
  }

  async function createPost(input: {
    token: Address;
    price: bigint;
    accessViaSub: boolean;
    uri: string;
  }) {
    return write('createPost', [
      input.token,
      input.price,
      input.accessViaSub,
      input.uri,
    ]);
  }

  async function subscribe(planId: bigint, periods: number, value?: bigint) {
    return write('subscribe', [planId, BigInt(periods)], value ? { value } : undefined);
  }

  async function buyPost(postId: bigint, value?: bigint) {
    return write('buyPost', [postId], value ? { value } : undefined);
  }

  // --------- reads
  const getCreatorPlanIds = (creator: Address) =>
    read('getCreatorPlanIds', [creator]) as Promise<bigint[]>;

  const getCreatorPostIds = (creator: Address) =>
    read('getCreatorPostIds', [creator]) as Promise<bigint[]>;

  const isActive = (user: Address, creator: Address) =>
    read('isActive', [user, creator]) as Promise<boolean>;

  const hasPostAccess = (user: Address, postId: bigint) =>
    read('hasPostAccess', [user, postId]) as Promise<boolean>;

  const getPlan = (id: bigint) =>
    read('plans', [id]) as Promise<{
      creator: Address; token: Address; pricePerPeriod: bigint; periodDays: number;
      active: boolean; name: string; metadataURI: string;
    }>;

  const getPost = (id: bigint) =>
    read('posts', [id]) as Promise<{
      creator: Address; token: Address; price: bigint; active: boolean; accessViaSub: boolean; uri: string;
    }>;

  return {
    address,
    createPlan,
    createPost,
    subscribe,
    buyPost,
    getCreatorPlanIds,
    getCreatorPostIds,
    isActive,
    hasPostAccess,
    getPlan,
    getPost,
  };
}
