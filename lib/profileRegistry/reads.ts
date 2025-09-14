// lib/profileRegistry/reads.ts
import { createPublicClient, http, type Abi, type Address } from 'viem';
import { base as BASE } from 'viem/chains';
import { PROFILE_REGISTRY_ABI } from './abi';
import { REGISTRY_ADDRESS } from './constants';

/**
 * Create a public client pointed at Base.
 * Uses NEXT_PUBLIC_BASE_RPC_URL or BASE_RPC_URL if provided; otherwise falls back to default.
 */
function getClient() {
  const rpc =
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    process.env.BASE_RPC_URL ||
    undefined;

  return createPublicClient({
    chain: BASE,
    transport: http(rpc),
  });
}

/** ---------------- Types returned by helpers ---------------- */
export type ChainProfile = {
  id: bigint;
  owner: `0x${string}`;
  handle: string;
  displayName: string;
  avatarURI: string;
  bio: string;
  fid: bigint;
  createdAt: bigint; // seconds (on-chain)
};

export type ListProfilesFlatResult = {
  items: ChainProfile[];
  nextCursor: bigint | null;
};

/** ---------------- Simple reads ---------------- */

/** getIdByHandle(handle) */
export async function readIdByHandle(handle: string): Promise<bigint> {
  const client = getClient();
  const id = (await client.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'getIdByHandle',
    args: [handle],
  })) as bigint;
  return id;
}

/** getProfile(id) */
export async function getProfile(id: bigint): Promise<ChainProfile> {
  const client = getClient();
  const [owner, handle, displayName, avatarURI, bio, fid, createdAt] =
    (await client.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfile',
      args: [id],
    })) as [
      `0x${string}`,
      string,
      string,
      string,
      string,
      bigint,
      bigint // uint64 -> return as bigint (seconds)
    ];

  return {
    id,
    owner,
    handle,
    displayName,
    avatarURI,
    bio,
    fid,
    createdAt,
  };
}

/** getProfileByHandle(handle) */
export async function getProfileByHandle(handle: string): Promise<{
  exists: boolean;
  profile: ChainProfile | null;
}> {
  const client = getClient();
  const [exists, id, owner, h, displayName, avatarURI, bio, fid, createdAt] =
    (await client.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfileByHandle',
      args: [handle],
    })) as [
      boolean,
      bigint,
      `0x${string}`,
      string,
      string,
      string,
      string,
      bigint,
      bigint
    ];

  if (!exists) {
    return { exists, profile: null };
  }
  return {
    exists,
    profile: {
      id,
      owner,
      handle: h,
      displayName,
      avatarURI,
      bio,
      fid,
      createdAt,
    },
  };
}

/** getProfilesByOwner(owner) */
export async function readProfilesByOwner(
  owner: `0x${string}`
): Promise<bigint[]> {
  const client = getClient();
  const ids = (await client.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'getProfilesByOwner',
    args: [owner],
  })) as bigint[];
  return ids ?? [];
}

/** handleTaken(handle) */
export async function handleTaken(handle: string): Promise<boolean> {
  const client = getClient();
  const taken = (await client.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'handleTaken',
    args: [handle],
  })) as boolean;
  return taken;
}

/** feeUnits() */
export async function feeUnits(): Promise<bigint> {
  const client = getClient();
  const fee = (await client.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'feeUnits',
  })) as bigint;
  return fee ?? 0n;
}

/** previewCreate(user) */
export async function readPreviewCreate(user: Address): Promise<{
  balance: bigint;
  allowance: bigint;
  fee: bigint;
  okBalance: boolean;
  okAllowance: boolean;
}> {
  const client = getClient();
  const [balance, allowance, fee, okBalance, okAllowance] =
    (await client.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'previewCreate',
      args: [user],
    })) as [bigint, bigint, bigint, boolean, boolean];

  return { balance, allowance, fee, okBalance, okAllowance };
}

/** listProfilesFlat(cursor, size) -> arrays flattened into objects */
export async function listProfilesFlat(
  cursor: bigint,
  size: bigint
): Promise<ListProfilesFlatResult> {
  const client = getClient();
  const [
    outIds,
    owners,
    handles,
    displayNames,
    avatarURIs,
    bios,
    fids,
    createdAts,
    nextCursor,
  ] = (await client.readContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'listProfilesFlat',
    args: [cursor, size],
  })) as [
    bigint[],
    `0x${string}`[],
    string[],
    string[],
    string[],
    string[],
    bigint[],
    bigint[], // uint64[] seconds
    bigint
  ];

  const items: ChainProfile[] = (outIds ?? []).map((id, i) => ({
    id,
    owner: owners[i],
    handle: handles[i] || '',
    displayName: displayNames[i] || '',
    avatarURI: avatarURIs[i] || '',
    bio: bios[i] || '',
    fid: fids[i] ?? 0n,
    createdAt: createdAts[i] ?? 0n,
  }));

  // If the contract returns 0 for end-of-list, normalize to null
  const next = nextCursor && nextCursor !== 0n ? nextCursor : null;

  return { items, nextCursor: next };
}

/** Convenience alias some code expects */
export const readProfilesFlat = listProfilesFlat;
