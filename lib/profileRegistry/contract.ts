// lib/profileRegistry/contract.ts
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import type { Abi, Address } from 'viem';
import { PROFILE_REGISTRY_ABI, PROFILE_REGISTRY_ADDR } from '@/lib/registry';

// Public client for read calls (no private key, safe on server)
const RPC = process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org';
export const registryClient = createPublicClient({
  chain: base,
  transport: http(RPC),
});

// Reads you can import server-side if you need them
export async function readFeeUnits() {
  return (await registryClient.readContract({
    address: PROFILE_REGISTRY_ADDR as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'feeUnits',
  })) as bigint;
}

export async function readHandleTaken(handle: string) {
  return (await registryClient.readContract({
    address: PROFILE_REGISTRY_ADDR as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'handleTaken',
    args: [handle],
  })) as boolean;
}

export async function readIdByHandle(handle: string) {
  return (await registryClient.readContract({
    address: PROFILE_REGISTRY_ADDR as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'getIdByHandle',
    args: [handle],
  })) as bigint;
}
