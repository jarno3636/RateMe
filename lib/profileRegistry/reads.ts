// lib/profileRegistry/reads.ts
import { getReadProvider, getRegistryContract } from "./contract";

const rp = getReadProvider();

export async function feeInfo() {
  const c = getRegistryContract(rp);
  const [treasury, fee] = await c.feeInfo();
  return { treasury, fee }; // fee is in 6 decimals (USDC)
}

export async function handleTaken(handle: string) {
  const c = getRegistryContract(rp);
  return c.handleTaken(handle.toLowerCase());
}

export async function canRegister(handle: string) {
  const c = getRegistryContract(rp);
  const [ok, reason] = await c.canRegister(handle.toLowerCase());
  return { ok, reason };
}

export async function getIdByHandle(handle: string) {
  const c = getRegistryContract(rp);
  return c.getIdByHandle(handle.toLowerCase());
}

export async function getProfile(id: bigint) {
  const c = getRegistryContract(rp);
  const res = await c.getProfile(id);
  // res: [owner, handle, displayName, avatarURI, bio, fid, createdAt]
  return {
    owner:      res[0] as string,
    handle:     res[1] as string,
    displayName:res[2] as string,
    avatarURI:  res[3] as string,
    bio:        res[4] as string,
    fid:        res[5] as bigint,
    createdAt:  res[6] as bigint
  };
}

export async function getProfileByHandle(handle: string) {
  const c = getRegistryContract(rp);
  const res = await c.getProfileByHandle(handle.toLowerCase());
  const exists = res[0] as boolean;
  if (!exists) return null;
  return {
    id:         res[1] as bigint,
    owner:      res[2] as string,
    handle:     res[3] as string,
    displayName:res[4] as string,
    avatarURI:  res[5] as string,
    bio:        res[6] as string,
    fid:        res[7] as bigint,
    createdAt:  res[8] as bigint
  };
}

export async function listProfilesFlat(cursor = 1n, size = 25n) {
  const c = getRegistryContract(rp);
  const res = await c.listProfilesFlat(cursor, size);
  // res: [outIds, owners, handles, displayNames, avatarURIs, bios, fids, createdAts, nextCursor]
  const nextCursor = res[8] as bigint;
  const n = (res[0] as bigint[]).length;
  const items = Array.from({ length: n }, (_, i) => ({
    id:         (res[0] as bigint[])[i],
    owner:      (res[1] as string[])[i],
    handle:     (res[2] as string[])[i],
    displayName:(res[3] as string[])[i],
    avatarURI:  (res[4] as string[])[i],
    bio:        (res[5] as string[])[i],
    fid:        (res[6] as bigint[])[i],
    createdAt:  (res[7] as bigint[])[i]
  }));
  return { items, nextCursor };
}

export async function previewCreate(user: string) {
  const c = getRegistryContract(rp);
  const [balance, allowance, fee, okBalance, okAllowance] = await c.previewCreate(user);
  return { balance, allowance, fee, okBalance, okAllowance };
}
