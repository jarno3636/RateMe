import type { Abi, Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { PROFILE_REGISTRY_ABI } from './abi';
import { REGISTRY_ADDRESS, registryConfigured, ZERO_ADDRESS } from './constants';

const pub = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
      process.env.BASE_RPC_URL ||
      'https://mainnet.base.org'
  ),
});

// Types that mirror the contract
export type Profile = {
  owner: Address;
  handle: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  fid: number;
  createdAt: number; // ms
};

export type ProfileFlat = {
  id: string;         // handle (lowercased)
  address: Address;
  displayName: string;
  avatarUrl: string;
  bio: string;
  fid: number;
  createdAt: number;
};

/** Read a single profile by numeric id (tokenId) */
export async function getProfile(id: bigint): Promise<Profile | null> {
  if (!registryConfigured || !REGISTRY_ADDRESS) return null;
  try {
    const r = (await pub.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfile',
      args: [id],
    })) as any;
    if (!r) return null;
    return {
      owner: r[0] as Address,
      handle: String(r[1] || ''),
      displayName: String(r[2] || ''),
      avatarUrl: String(r[3] || ''),
      bio: String(r[4] || ''),
      fid: Number(BigInt(r[5] || 0)),
      createdAt: Number(BigInt(r[6] || 0)) * 1000,
    };
  } catch {
    return null;
  }
}

/** Read a single profile by handle */
export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  if (!registryConfigured || !REGISTRY_ADDRESS) return null;
  try {
    const r = (await pub.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfileByHandle',
      args: [handle],
    })) as any;
    if (!r?.[0]) return null;
    return {
      owner: (r[2] || r[3]) as Address,
      handle,
      displayName: String(r[4] || ''),
      avatarUrl: String(r[5] || ''),
      bio: String(r[6] || ''),
      fid: Number(BigInt(r[7] || 0)),
      createdAt: Number(BigInt(r[8] || 0)) * 1000,
    };
  } catch {
    return null;
  }
}

/** True if a handle is already taken on-chain */
export async function handleTaken(handle: string): Promise<boolean> {
  if (!registryConfigured || !REGISTRY_ADDRESS) return false;
  try {
    return (await pub.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'handleTaken',
      args: [handle],
    })) as boolean;
  } catch {
    return false;
  }
}

/** Batch read a set of numeric ids into a flat shape that's easy to render */
export async function readProfilesFlat(ids: readonly bigint[]): Promise<ProfileFlat[]> {
  const out: ProfileFlat[] = [];
  for (const id of ids) {
    const p = await getProfile(id);
    if (!p) continue;
    out.push({
      id: p.handle || id.toString(),
      address: p.owner,
      displayName: p.displayName || p.handle || id.toString(),
      avatarUrl: p.avatarUrl || '',
      bio: p.bio || '',
      fid: p.fid,
      createdAt: p.createdAt,
    });
  }
  return out;
}

/** Compatibility export for older imports */
export async function listProfilesFlat(ids: readonly bigint[]): Promise<ProfileFlat[]> {
  return readProfilesFlat(ids);
}
