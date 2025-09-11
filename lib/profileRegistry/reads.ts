// lib/profileRegistry/reads.ts
import type { Abi, Address } from 'viem';
import { PROFILE_REGISTRY_ABI } from './abi';
import { REGISTRY_ADDRESS } from './constants';
import {
  registryClient as readClient,
  readFeeUnits,
  readHandleTaken,
  readIdByHandle,
  getReadProvider,     // legacy shim
  getRegistryContract, // legacy shim
} from './contract';

/* ------------------------------------------------------------------ */
/* Re-exports (back-compat)                                            */
/* ------------------------------------------------------------------ */
export {
  readClient,
  readFeeUnits,
  readHandleTaken,
  readIdByHandle,
  getReadProvider,
  getRegistryContract,
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export type CanRegister = { ok: boolean; reason: string };

export type PreviewCreate = {
  balance: bigint;
  allowance: bigint;
  fee: bigint;
  okBalance: boolean;
  okAllowance: boolean;
};

export type ProfileFlat = {
  id: bigint;
  owner: Address;
  handle: string;
  displayName: string;
  avatarURI: string;
  bio: string;
  fid: bigint;
  createdAt: bigint; // unix seconds
};

export type ListProfilesResult = {
  items: ProfileFlat[];
  nextCursor: bigint;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const REG = REGISTRY_ADDRESS as Address;
const ABI = PROFILE_REGISTRY_ABI as Abi;

function normalizeHandle(h: string) {
  return h.trim().replace(/^@+/, '').toLowerCase();
}

/* ------------------------------------------------------------------ */
/* New, richer reads                                                   */
/* ------------------------------------------------------------------ */

/** canRegister(handle) -> { ok, reason } for great UX during signup */
export async function readCanRegister(rawHandle: string): Promise<CanRegister> {
  const handle = normalizeHandle(rawHandle);
  const [ok, reason] = (await readClient.readContract({
    address: REG,
    abi: ABI,
    functionName: 'canRegister',
    args: [handle],
  })) as unknown as [boolean, string];
  return { ok, reason };
}

/** previewCreate(user) -> fee/allowance/balance checks (null if absent on old deployments) */
export async function readPreviewCreate(user: Address): Promise<PreviewCreate | null> {
  try {
    const [balance, allowance, fee, okBalance, okAllowance] = (await readClient.readContract({
      address: REG,
      abi: ABI,
      functionName: 'previewCreate',
      args: [user],
    })) as unknown as [bigint, bigint, bigint, boolean, boolean];

    return { balance, allowance, fee, okBalance, okAllowance };
  } catch {
    return null;
  }
}

/** getProfileByHandle(handle) mapped to a clean object (null if not found) */
export async function readProfileByHandle(rawHandle: string): Promise<ProfileFlat | null> {
  const handle = normalizeHandle(rawHandle);
  const res = (await readClient.readContract({
    address: REG,
    abi: ABI,
    functionName: 'getProfileByHandle',
    args: [handle],
  })) as unknown as [
    boolean,      // exists
    bigint,       // id
    Address,      // owner
    string,       // handle
    string,       // displayName
    string,       // avatarURI
    string,       // bio
    bigint,       // fid
    bigint        // createdAt
  ];

  const exists = res?.[0];
  if (!exists) return null;

  return {
    id: res[1],
    owner: res[2],
    handle: res[3],
    displayName: res[4],
    avatarURI: res[5],
    bio: res[6],
    fid: res[7],
    createdAt: res[8],
  };
}

/** ids owned by a wallet address */
export async function readProfilesByOwner(owner: Address): Promise<bigint[]> {
  return (await readClient.readContract({
    address: REG,
    abi: ABI,
    functionName: 'getProfilesByOwner',
    args: [owner],
  })) as bigint[];
}

/** getProfilesFlat(ids[]) -> array of flat profiles in the same order as ids */
export async function readProfilesFlat(ids: bigint[]): Promise<ProfileFlat[]> {
  if (!ids?.length) return [];
  const r = (await readClient.readContract({
    address: REG,
    abi: ABI,
    functionName: 'getProfilesFlat',
    args: [ids],
  })) as unknown as [
    bigint[],   // outIds
    Address[],  // owners
    string[],   // handles
    string[],   // displayNames
    string[],   // avatarURIs
    string[],   // bios
    bigint[],   // fids
    bigint[]    // createdAts
  ];

  const outIds = r[0] || [];
  const owners = r[1] || [];
  const handles = r[2] || [];
  const displayNames = r[3] || [];
  const avatarURIs = r[4] || [];
  const bios = r[5] || [];
  const fids = r[6] || [];
  const createdAts = r[7] || [];

  const n = outIds.length;
  const items: ProfileFlat[] = new Array(n);
  for (let i = 0; i < n; i++) {
    items[i] = {
      id: outIds[i],
      owner: owners[i],
      handle: handles[i],
      displayName: displayNames[i],
      avatarURI: avatarURIs[i],
      bio: bios[i],
      fid: fids[i],
      createdAt: createdAts[i],
    };
  }
  return items;
}

/**
 * listProfilesFlat(cursor,size) -> mapped objects + nextCursor
 * Use size ~ 12–50 for UI pages. Pass cursor=0n for the first page.
 */
export async function listProfilesFlat(
  cursor: bigint,
  size: bigint
): Promise<ListProfilesResult> {
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
  ] = (await readClient.readContract({
    address: REG,
    abi: ABI,
    functionName: 'listProfilesFlat',
    args: [cursor, size],
  })) as unknown as [
    bigint[],     // outIds
    Address[],    // owners
    string[],     // handles
    string[],     // displayNames
    string[],     // avatarURIs
    string[],     // bios
    bigint[],     // fids
    bigint[],     // createdAts
    bigint        // nextCursor
  ];

  const n = outIds.length;
  const items: ProfileFlat[] = new Array(n);
  for (let i = 0; i < n; i++) {
    items[i] = {
      id: outIds[i],
      owner: owners[i],
      handle: handles[i],
      displayName: displayNames[i],
      avatarURI: avatarURIs[i],
      bio: bios[i],
      fid: fids[i],
      createdAt: createdAts[i],
    };
  }

  return { items, nextCursor };
}

/** Convenience: return all profile IDs (if you ever need to fan-out) */
export async function readAllIds(): Promise<bigint[]> {
  return (await readClient.readContract({
    address: REG,
    abi: ABI,
    functionName: 'allIds',
  })) as bigint[];
}
