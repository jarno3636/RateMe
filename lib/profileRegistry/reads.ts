// lib/profileRegistry/reads.ts
import {
  createPublicClient,
  http,
  type Address,
  type Abi,
  getAddress,
} from 'viem';
import { base as BASE } from 'viem/chains';
import {
  PROFILE_REGISTRY_ADDR,
  PROFILE_REGISTRY_ABI,
} from './constants';

const rpc =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.BASE_RPC_URL ||
  undefined;

const pub = createPublicClient({
  chain: BASE,
  transport: http(rpc),
});

export type ProfileFlat = {
  id: bigint;
  owner: Address;
  handle: string;
  displayName: string;
  avatarURI: string;
  bio: string;
  fid: bigint;
  createdAt: number; // ms
};

export async function readIdByHandle(handle: string): Promise<bigint> {
  const id = (await pub.readContract({
    address: PROFILE_REGISTRY_ADDR,
    abi: PROFILE_REGISTRY_ABI,
    functionName: 'getIdByHandle',
    args: [handle],
  })) as bigint;
  return id;
}

export async function handleTaken(handle: string): Promise<boolean> {
  const ok = (await pub.readContract({
    address: PROFILE_REGISTRY_ADDR,
    abi: PROFILE_REGISTRY_ABI,
    functionName: 'handleTaken',
    args: [handle],
  })) as boolean;
  return ok;
}

export async function feeUnits(): Promise<bigint> {
  return (await pub.readContract({
    address: PROFILE_REGISTRY_ADDR,
    abi: PROFILE_REGISTRY_ABI,
    functionName: 'feeUnits',
  })) as bigint;
}

export async function readPreviewCreate(user: Address): Promise<{
  balance: bigint;
  allowance: bigint;
  fee: bigint;
  okBalance: boolean;
  okAllowance: boolean;
}> {
  const [balance, allowance_, fee, okBalance, okAllowance] = (await pub.readContract(
    {
      address: PROFILE_REGISTRY_ADDR,
      abi: PROFILE_REGISTRY_ABI,
      functionName: 'previewCreate',
      args: [user],
    }
  )) as readonly [bigint, bigint, bigint, boolean, boolean];

  return { balance, allowance: allowance_, fee, okBalance, okAllowance };
}

export async function getProfile(id: bigint): Promise<ProfileFlat> {
  const [owner, handle, displayName, avatarURI, bio, fid, createdAt] =
    (await pub.readContract({
      address: PROFILE_REGISTRY_ADDR,
      abi: PROFILE_REGISTRY_ABI,
      functionName: 'getProfile',
      args: [id],
    })) as readonly [Address, string, string, string, string, bigint, bigint];

  return {
    id,
    owner,
    handle,
    displayName,
    avatarURI,
    bio,
    fid,
    createdAt: Number(createdAt) * 1000,
  };
}

export async function getProfileByHandle(handle: string): Promise<{
  exists: boolean;
  profile?: ProfileFlat;
}> {
  const [exists, id, owner, handle_, displayName, avatarURI, bio, fid, createdAt] =
    (await pub.readContract({
      address: PROFILE_REGISTRY_ADDR,
      abi: PROFILE_REGISTRY_ABI,
      functionName: 'getProfileByHandle',
      args: [handle],
    })) as readonly [boolean, bigint, Address, string, string, string, string, bigint, bigint];

  if (!exists) return { exists: false };
  return {
    exists: true,
    profile: {
      id,
      owner,
      handle: handle_,
      displayName,
      avatarURI,
      bio,
      fid,
      createdAt: Number(createdAt) * 1000,
    },
  };
}

export async function readProfilesByOwner(owner: Address): Promise<bigint[]> {
  const ids = (await pub.readContract({
    address: PROFILE_REGISTRY_ADDR,
    abi: PROFILE_REGISTRY_ABI,
    functionName: 'getProfilesByOwner',
    args: [owner],
  })) as bigint[];
  return ids;
}

/** Paged chain read */
export async function listProfilesFlat(cursor: bigint, size: bigint): Promise<{
  items: {
    id: bigint;
    owner: Address;
    handle: string;
    displayName: string;
    avatarURI: string;
    bio: string;
    fid: bigint;
    createdAt: number; // ms
  }[];
  nextCursor: bigint;
}> {
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
  ] = (await pub.readContract({
    address: PROFILE_REGISTRY_ADDR,
    abi: PROFILE_REGISTRY_ABI,
    functionName: 'listProfilesFlat',
    args: [cursor, size],
  })) as readonly [
    bigint[],
    Address[],
    string[],
    string[],
    string[],
    string[],
    bigint[],
    bigint[],
    bigint
  ];

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

  return { items, nextCursor };
}
