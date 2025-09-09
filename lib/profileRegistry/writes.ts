// lib/profileRegistry/writes.ts
import type { Address, PublicClient, WalletClient, Abi } from 'viem';
import {
  PROFILE_REGISTRY_ABI,
  PROFILE_REGISTRY_ADDR,
  USDC_ABI,
  BASE_USDC,
} from '@/lib/registry';

// Approve USDC if needed
export async function ensureUSDCApproval(
  pub: PublicClient,
  wallet: WalletClient,
  owner: Address,
  needed: bigint
) {
  const allowance = (await pub.readContract({
    address: BASE_USDC,
    abi: USDC_ABI as Abi,
    functionName: 'allowance',
    args: [owner, PROFILE_REGISTRY_ADDR as Address],
  })) as bigint;

  if (allowance >= needed) return;

  const { request } = await pub.simulateContract({
    address: BASE_USDC,
    abi: USDC_ABI as Abi,
    functionName: 'approve',
    args: [PROFILE_REGISTRY_ADDR as Address, needed],
    account: wallet.account!,
  });
  const hash = await wallet.writeContract(request);
  await pub.waitForTransactionReceipt({ hash });
}

export async function callCreateProfile(
  pub: PublicClient,
  wallet: WalletClient,
  args: {
    handle: string;
    displayName?: string;
    avatarURI?: string;
    bio?: string;
    fid?: bigint;
  }
) {
  const { request } = await pub.simulateContract({
    address: PROFILE_REGISTRY_ADDR as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'createProfile',
    args: [
      args.handle.toLowerCase(),
      args.displayName ?? '',
      args.avatarURI ?? '',
      args.bio ?? '',
      args.fid ?? 0n,
    ],
    account: wallet.account!,
  });
  const hash = await wallet.writeContract(request);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}
