// hooks/useProfileRegistry.ts
'use client';

import { usePublicClient, useAccount } from 'wagmi';
import type { Address } from 'viem';
import { PROFILE_REGISTRY_ABI } from '@/lib/profileRegistry/abi';
import { REGISTRY_ADDRESS, registryConfigured, BASE_CHAIN_ID, USDC_ADDRESS, ZERO_ADDRESS } from '@/lib/profileRegistry/constants';
import { readIdByHandle, getProfile, getProfileByHandle, readProfilesByOwner, readProfilesFlat, readPreviewCreate, handleTaken, listProfilesFlat } from '@/lib/profileRegistry/reads';

export function useProfileRegistry() {
  const pub = usePublicClient();
  const { address, chainId } = useAccount();

  async function call<T extends string>(fn: T, args: any[] = []) {
    if (!registryConfigured) throw new Error('ProfileRegistry not configured');
    return pub.readContract({
      address: REGISTRY_ADDRESS!,
      abi: PROFILE_REGISTRY_ABI,
      functionName: fn as any,
      args,
    } as any);
  }

  return {
    // env/context helpers
    baseChainId: BASE_CHAIN_ID,
    usdc: USDC_ADDRESS,
    zero: ZERO_ADDRESS,

    // high-level reads
    readIdByHandle,
    getProfile,
    getProfileByHandle,
    readProfilesByOwner,
    readProfilesFlat,
    readPreviewCreate,
    handleTaken,
    listProfilesFlat,

    // low-level passthrough (if needed)
    call,

    // session info
    address: address as Address | undefined,
    onBase: (chainId || 0) === BASE_CHAIN_ID,
  };
}
