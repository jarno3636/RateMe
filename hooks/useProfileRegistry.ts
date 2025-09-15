// /hooks/useProfileRegistry.ts
"use client"

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
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
  const fallback = useAccount()
  const who = user ?? (fallback.address as `0x${string}` | undefined)
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "previewCreate",
    args: who ? [who] : undefined,
    query: { enabled: !!who },
  })
}

/* ---------------------------- WRITE HOOKS ----------------------------- */

export function useCreateProfile() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  return {
    create: (handle: string, displayName: string, avatarURI: string, bio: string, fid: bigint) =>
      writeContract({
        abi: ProfileRegistry as any,
        address: REGISTRY,
        functionName: "createProfile",
        args: [handle, displayName, avatarURI, bio, fid],
      }),
    hash,
    isPending,
    wait,
    error,
  }
}

export function useUpdateProfile() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  return {
    update: (id: bigint, displayName: string, avatarURI: string, bio: string, fid: bigint) =>
      writeContract({
        abi: ProfileRegistry as any,
        address: REGISTRY,
        functionName: "updateProfile",
        args: [id, displayName, avatarURI, bio, fid],
      }),
    hash,
    isPending,
    wait,
    error,
  }
}

export function useChangeHandle() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  return {
    change: (id: bigint, newHandle: string) =>
      writeContract({
        abi: ProfileRegistry as any,
        address: REGISTRY,
        functionName: "changeHandle",
        args: [id, newHandle],
      }),
    hash,
    isPending,
    wait,
    error,
  }
}

/** Optional: transfer a profile to another address */
export function useTransferProfile() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  return {
    transfer: (id: bigint, to: `0x${string}`) =>
      writeContract({
        abi: ProfileRegistry as any,
        address: REGISTRY,
        functionName: "transferProfile",
        args: [id, to],
      }),
    hash,
    isPending,
    wait,
    error,
  }
}
