// lib/profileRegistry/contract.ts
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import type { Abi, Address } from 'viem';

import { PROFILE_REGISTRY_ABI } from './abi';
import {
  REGISTRY_ADDRESS,
  BASE_CHAIN_ID,
  ZERO_ADDRESS,
  registryConfigured,
} from './constants';

/* ----------------------------------------------------------- */
/* Client                                                       */
/* ----------------------------------------------------------- */

const RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.BASE_RPC_URL ||
  'https://mainnet.base.org';

// Note: BASE_CHAIN_ID currently defaults to 8453 (Base mainnet).
// If you later support multiple chains, swap this to a map/defineChain().
export const registryClient = createPublicClient({
  chain: base,
  transport: http(RPC),
});

function ensureConfigured() {
  if (!registryConfigured || REGISTRY_ADDRESS === ZERO_ADDRESS) {
    throw new Error('ProfileRegistry address not configured');
  }
}

/* ----------------------------------------------------------- */
/* Reads (usable anywhere, server/client)                      */
/* ----------------------------------------------------------- */

export async function readFeeUnits(): Promise<bigint> {
  ensureConfigured();
  return (await registryClient.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'feeUnits',
  })) as bigint;
}

export async function readHandleTaken(handle: string): Promise<boolean> {
  ensureConfigured();
  return (await registryClient.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'handleTaken',
    args: [handle],
  })) as boolean;
}

export async function readIdByHandle(handle: string): Promise<bigint> {
  ensureConfigured();
  return (await registryClient.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'getIdByHandle',
    args: [handle],
  })) as bigint;
}

/** Convenience: fetch the flat profile by handle (exists flag + fields). */
export async function readProfileByHandle(handle: string): Promise<{
  exists: boolean;
  id: bigint;
  owner: Address;
  handle: string;
  displayName: string;
  avatarURI: string;
  bio: string;
  fid: bigint;
  createdAt: bigint;
}> {
  ensureConfigured();
  const r = (await registryClient.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'getProfileByHandle',
    args: [handle],
  })) as any;

  // r = [exists, id, owner, handle, displayName, avatarURI, bio, fid, createdAt]
  return {
    exists: Boolean(r?.[0]),
    id: BigInt(r?.[1] ?? 0),
    owner: (r?.[2] ?? ZERO_ADDRESS) as Address,
    handle: String(r?.[3] ?? ''),
    displayName: String(r?.[4] ?? ''),
    avatarURI: String(r?.[5] ?? ''),
    bio: String(r?.[6] ?? ''),
    fid: BigInt(r?.[7] ?? 0),
    createdAt: BigInt(r?.[8] ?? 0),
  };
}

/** Preview create call (USDC balance/allowance vs. fee) for a given user. */
export async function readPreviewCreate(user: Address): Promise<{
  balance: bigint;
  allowance: bigint;
  fee: bigint;
  okBalance: boolean;
  okAllowance: boolean;
}> {
  ensureConfigured();
  const r = (await registryClient.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'previewCreate',
    args: [user],
  })) as any;

  // r = [balance, allowance, fee, okBalance, okAllowance]
  return {
    balance: BigInt(r?.[0] ?? 0),
    allowance: BigInt(r?.[1] ?? 0),
    fee: BigInt(r?.[2] ?? 0),
    okBalance: Boolean(r?.[3]),
    okAllowance: Boolean(r?.[4]),
  };
}

/* ----------------------------------------------------------- */
/* Shims (keeps older call sites working)                      */
/* ----------------------------------------------------------- */

export function getReadProvider() {
  // legacy shim for older code that expected an ethers provider
  return registryClient;
}

export function getRegistryContract() {
  // legacy shim for older code that expected { address, abi }
  return {
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
  };
}

/* ----------------------------------------------------------- */
/* Expose a couple of useful constants                         */
/* ----------------------------------------------------------- */

export { REGISTRY_ADDRESS as PROFILE_REGISTRY_ADDR, BASE_CHAIN_ID };
export { PROFILE_REGISTRY_ABI };
