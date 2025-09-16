// /hooks/useProfileRegistry.ts
"use client"

import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi"
import { base } from "viem/chains"
import ProfileRegistry from "@/abi/ProfileRegistry.json"

export const REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`

/* ----------------------------- READ HOOKS ----------------------------- */

/** Paginated flat listing: ids, owners, handles, names, avatars, bios, fids, createdAts, nextCursor */
export function useListProfiles(cursor: bigint = 0n, size: bigint = 12n) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "listProfilesFlat",
    args: [cursor, size],
  })
}

/** Single profile by id -> (owner_, handle_, displayName_, avatarURI_, bio_, fid_, createdAt_) */
export function useGetProfile(id?: bigint) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getProfile",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined },
  })
}

/** Batch flat fetch by ids -> outIds, owners, handles, displayNames, avatarURIs, bios, fids, createdAts */
export function useGetProfilesFlat(ids?: bigint[]) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getProfilesFlat",
    args: ids && ids.length ? [ids] : undefined,
    query: { enabled: !!ids && ids.length > 0 },
  })
}

/** Resolve id from handle */
export function useGetIdByHandle(handle?: string) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getIdByHandle",
    args: handle ? [handle] : undefined,
    query: { enabled: !!handle },
  })
}

/** Resolve full profile by handle (exists, id, owner_, handle_, displayName_, avatarURI_, bio_, fid_, createdAt_) */
export function useGetProfileByHandle(handle?: string) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getProfileByHandle",
    args: handle ? [handle] : undefined,
    query: { enabled: !!handle },
  })
}

/** All profile IDs owned by an address */
export function useProfilesByOwner(owner?: `0x${string}`) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getProfilesByOwner",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  })
}

/** Can a handle be registered? -> (ok, reason) */
export function useCanRegister(handle?: string) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "canRegister",
    args: handle ? [handle] : undefined,
    query: { enabled: !!handle },
  })
}

/** Is a handle taken? -> bool */
export function useHandleTaken(handle?: string) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "handleTaken",
    args: handle ? [handle] : undefined,
    query: { enabled: !!handle },
  })
}

/** Fee info -> (treasury, feeUnits) */
export function useFeeInfo() {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "feeInfo",
  })
}

/** Flat fee units only (e.g., 500_000 for $0.50 with 6dp USDC) */
export function useFeeUnits() {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "feeUnits",
  })
}

/** Next profile id (monotonic) */
export function useNextId() {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "nextId",
  })
}

/** Total profiles created */
export function useProfileCount() {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "profileCount",
  })
}

/** Preview create for connected user -> (balance, allowance_, fee, okBalance, okAllowance) */
export function usePreviewCreate(user?: `0x${string}`) {
  const { address } = useAccount()
  const who = user ?? (address as `0x${string}` | undefined)
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "previewCreate",
    args: who ? [who] : undefined,
    query: { enabled: !!who },
  })
}

/* ---------------------------- WRITE HOOKS ----------------------------- */
/* All writes: require account + chain, and await receipt via public client. */

export function useCreateProfile() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const create = async (
    handle: string,
    displayName: string,
    avatarURI: string,
    bio: string,
    fid: bigint
  ) => {
    if (!address) throw new Error("Connect your wallet to create a profile.")
    const hash = await writeContractAsync({
      abi: ProfileRegistry as any,
      address: REGISTRY,
      functionName: "createProfile",
      args: [handle, displayName, avatarURI, bio, fid],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { create, isPending, error }
}

export function useUpdateProfile() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const update = async (
    id: bigint,
    displayName: string,
    avatarURI: string,
    bio: string,
    fid: bigint
  ) => {
    if (!address) throw new Error("Connect your wallet to update a profile.")
    const hash = await writeContractAsync({
      abi: ProfileRegistry as any,
      address: REGISTRY,
      functionName: "updateProfile",
      args: [id, displayName, avatarURI, bio, fid],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { update, isPending, error }
}

export function useChangeHandle() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const change = async (id: bigint, newHandle: string) => {
    if (!address) throw new Error("Connect your wallet to change handle.")
    const hash = await writeContractAsync({
      abi: ProfileRegistry as any,
      address: REGISTRY,
      functionName: "changeHandle",
      args: [id, newHandle],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { change, isPending, error }
}

/** Optional: transfer a profile to another address */
export function useTransferProfile() {
  const client = usePublicClient()
  const { address } = useAccount()
  const { writeContractAsync, isPending, error } = useWriteContract()

  const transfer = async (id: bigint, to: `0x${string}`) => {
    if (!address) throw new Error("Connect your wallet to transfer a profile.")
    const hash = await writeContractAsync({
      abi: ProfileRegistry as any,
      address: REGISTRY,
      functionName: "transferProfile",
      args: [id, to],
      account: address,
      chain: base,
    })
    await client.waitForTransactionReceipt({ hash })
    return hash
  }

  return { transfer, isPending, error }
}
