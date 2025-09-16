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

type WatchOpts = { watch?: boolean }
const REFRESH_MS = 5_000

/* ----------------------------- READ HOOKS ----------------------------- */

/** Paginated flat listing: ids, owners, handles, names, avatars, bios, fids, createdAts, nextCursor */
export function useListProfiles(cursor: bigint = 0n, size: bigint = 12n, opts?: WatchOpts) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "listProfilesFlat",
    args: [cursor, size],
    query: {
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Single profile by id -> (owner_, handle_, displayName_, avatarURI_, bio_, fid_, createdAt_) */
export function useGetProfile(id?: bigint, opts?: WatchOpts) {
  const enabled = id !== undefined
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getProfile",
    args: enabled ? [id as bigint] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Batch flat fetch by ids -> outIds, owners, handles, displayNames, avatarURIs, bios, fids, createdAts */
export function useGetProfilesFlat(ids?: bigint[], opts?: WatchOpts) {
  const enabled = !!ids && ids.length > 0
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getProfilesFlat",
    args: enabled ? [ids as bigint[]] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Resolve id from handle */
export function useGetIdByHandle(handle?: string, opts?: WatchOpts) {
  const enabled = !!handle
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getIdByHandle",
    args: enabled ? [handle as string] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Resolve full profile by handle (exists, id, owner_, handle_, displayName_, avatarURI_, bio_, fid_, createdAt_) */
export function useGetProfileByHandle(handle?: string, opts?: WatchOpts) {
  const enabled = !!handle
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getProfileByHandle",
    args: enabled ? [handle as string] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** All profile IDs owned by an address */
export function useProfilesByOwner(owner?: `0x${string}`, opts?: WatchOpts) {
  const enabled = !!owner
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "getProfilesByOwner",
    args: enabled ? [owner as `0x${string}`] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Can a handle be registered? -> (ok, reason) */
export function useCanRegister(handle?: string, opts?: WatchOpts) {
  const enabled = !!handle
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "canRegister",
    args: enabled ? [handle as string] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Is a handle taken? -> bool */
export function useHandleTaken(handle?: string, opts?: WatchOpts) {
  const enabled = !!handle
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "handleTaken",
    args: enabled ? [handle as string] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Fee info -> (treasury, feeUnits) */
export function useFeeInfo(opts?: WatchOpts) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "feeInfo",
    query: {
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Flat fee units only (e.g., 500_000 for $0.50 with 6dp USDC) */
export function useFeeUnits(opts?: WatchOpts) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "feeUnits",
    query: {
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Next profile id (monotonic) */
export function useNextId(opts?: WatchOpts) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "nextId",
    query: {
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Total profiles created */
export function useProfileCount(opts?: WatchOpts) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "profileCount",
    query: {
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Preview create for connected user -> (balance, allowance_, fee, okBalance, okAllowance) */
export function usePreviewCreate(user?: `0x${string}`, opts?: WatchOpts) {
  const { address } = useAccount()
  const who = (user ?? address) as `0x${string}` | undefined
  const enabled = !!who
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "previewCreate",
    args: enabled ? [who as `0x${string}`] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
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
