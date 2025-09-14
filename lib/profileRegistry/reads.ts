// lib/profileRegistry/reads.ts
import type { Abi, Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { PROFILE_REGISTRY_ABI } from './abi';
import { REGISTRY_ADDRESS, registryConfigured } from './constants';

const pub = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
      process.env.BASE_RPC_URL ||
      'https://mainnet.base.org'
  ),
});

function reg(): Address {
  if (!REGISTRY_ADDRESS) throw new Error('ProfileRegistry not configured');
  return REGISTRY_ADDRESS as Address;
}

export type Profile = {
  id: bigint;
  owner: Address;
  handle: string;
  displayName: string;
  avatarURI: string;
  bio: string;
  fid: bigint;
  createdAt: number; // ms
};

export async function readIdByHandle(handle: string): Promise<bigint | null> {
  if (!registryConfigured) return null;
  try {
    const id = (await pub.readContract({
      address: reg(),
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getIdByHandle',
      args: [handle],
    })) as bigint;
    return id;
  } catch {
    return null;
  }
}

export async function getProfile(id: bigint): Promise<Profile | null> {
  if (!registryConfigured) return null;
  try {
    const r = (await pub.readContract({
      address: reg(),
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfile',
      args: [id],
    })) as any;
    return {
      id,
      owner: r[0] as Address,
      handle: String(r[1] || ''),
      displayName: String(r[2] || ''),
      avatarURI: String(r[3] || ''),
      bio: String(r[4] || ''),
      fid: BigInt(r[5] || 0n),
      createdAt: Number(BigInt(r[6] || 0n)) * 1000,
    };
  } catch {
    return null;
  }
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  if (!registryConfigured) return null;
  try {
    const r = (await pub.readContract({
      address: reg(),
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfileByHandle',
      args: [handle],
    })) as any;
    if (!r?.[0]) return null;
    const id = BigInt(r[1] || 0);
    return {
      id,
      owner: (r[2] || r[3]) as Address,
      handle: String(r[3] || r[4] || handle), // handle_ at [3] per ABI
      displayName: String(r[4] || ''),
      avatarURI: String(r[5] || ''),
      bio: String(r[6] || ''),
      fid: BigInt(r[7] || 0n),
      createdAt: Number(BigInt(r[8] || 0n)) * 1000,
    };
  } catch {
    return null;
  }
}

export async function handleTaken(handle: string): Promise<boolean> {
  if (!registryConfigured) return false;
  try {
    return (await pub.readContract({
      address: reg(),
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'handleTaken',
      args: [handle],
    })) as boolean;
  } catch {
    return false;
  }
}

export async function readProfilesByOwner(owner: Address): Promise<bigint[]> {
  if (!registryConfigured) return [];
  try {
    const ids = (await pub.readContract({
      address: reg(),
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfilesByOwner',
      args: [owner],
    })) as readonly bigint[];
    return [...ids];
  } catch {
    return [];
  }
}

export async function readProfilesFlat(ids: readonly bigint[]) {
  if (!registryConfigured || ids.length === 0) return [];
  try {
    const r = (await pub.readContract({
      address: reg(),
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfilesFlat',
      args: [ids as any],
    })) as any;

    const outIds = r[0] as readonly bigint[];
    const owners = r[1] as readonly Address[];
    const handles = r[2] as readonly string[];
    const displayNames = r[3] as readonly string[];
    const avatarURIs = r[4] as readonly string[];
    const bios = r[5] as readonly string[];
    const fids = r[6] as readonly bigint[];
    const createdAts = r[7] as readonly bigint[];

    const rows = outIds.map((id, i) => ({
      id,
      owner: owners[i],
      handle: handles[i],
      displayName: displayNames[i],
      avatarURI: avatarURIs[i],
      bio: bios[i],
      fid: fids[i],
      createdAt: Number(createdAts[i]) * 1000,
    }));

    return rows;
  } catch {
    // fallback: loop single reads
    const rows = [];
    for (const id of ids) {
      const p = await getProfile(id);
      if (p) rows.push(p);
    }
    return rows;
  }
}

/** Cursor-based listing direct from contract (used by /api/creators) */
export async function listProfilesFlat(cursor: bigint, size: bigint) {
  if (!registryConfigured) {
    return { items: [], nextCursor: 0n };
  }
  try {
    const r = (await pub.readContract({
      address: reg(),
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'listProfilesFlat',
      args: [cursor, size],
    })) as any;

    const outIds = r[0] as readonly bigint[];
    const owners = r[1] as readonly Address[];
    const handles = r[2] as readonly string[];
    const displayNames = r[3] as readonly string[];
    const avatarURIs = r[4] as readonly string[];
    const bios = r[5] as readonly string[];
    const fids = r[6] as readonly bigint[];
    const createdAts = r[7] as readonly bigint[];
    const next = BigInt(r[8] || 0n);

    const items = outIds.map((id, i) => ({
      id,
      owner: owners[i],
      handle: handles[i],
      displayName: displayNames[i],
      avatarURI: avatarURIs[i],
      bio: bios[i],
      fid: fids[i],
      createdAt: Number(createdAts[i]) * 1000,
    }));

    return { items, nextCursor: next };
  } catch {
    return { items: [], nextCursor: 0n };
  }
}

/** Onboarding helper used by UI to check fee/balance/allowance quickly */
export async function readPreviewCreate(user: Address) {
  if (!registryConfigured) return { balance: 0n, allowance: 0n, fee: 0n, okBalance: false, okAllowance: false };
  try {
    const r = (await pub.readContract({
      address: reg(),
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'previewCreate',
      args: [user],
    })) as any;
    return {
      balance: BigInt(r[0] || 0),
      allowance: BigInt(r[1] || 0),
      fee: BigInt(r[2] || 0),
      okBalance: Boolean(r[3]),
      okAllowance: Boolean(r[4]),
    };
  } catch {
    return { balance: 0n, allowance: 0n, fee: 0n, okBalance: false, okAllowance: false };
  }
}
