// /hooks/useProfileRegistry.ts
"use client"

import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi"
import { createPublicClient, getAddress, http } from "viem"
import { base } from "viem/chains"
import ProfileRegistry from "@/abi/ProfileRegistry.json"

export const REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined
// Checksummed (prevents “bad address checksum” at runtime)
export const REGISTRY_CS = (REGISTRY ? (getAddress(REGISTRY) as `0x${string}`) : undefined)

// Standalone public client for non-hook helpers (usable in Header, server routes, etc.)
const pc = createPublicClient({ chain: base, transport: http() })

type WatchOpts = { watch?: boolean }
const REFRESH_MS = 5_000

/* ───────────────────────────── NON-HOOK HELPERS ───────────────────────────── */

/** Get a single profile tuple by id. */
export async function getProfile(id: bigint) {
  if (!REGISTRY_CS || !id || id <= 0n) return undefined
  try {
    const res = await pc.readContract({
      address: REGISTRY_CS,
      abi: ProfileRegistry as any,
      functionName: "getProfile",
      args: [id],
    })
    return res as unknown as [
      `0x${string}`, // owner
      string,        // handle
      string,        // displayName
      string,        // avatarURI
      string,        // bio
      bigint,        // fid
      bigint         // createdAt
    ]
  } catch {
    return undefined
  }
}

/** Resolve numeric id from a handle. Returns 0n if not found. */
export async function getProfileIdByHandle(handle: string): Promise<bigint> {
  if (!REGISTRY_CS || !handle) return 0n
  try {
    // You implemented both; prefer the direct id view if it exists.
    try {
      const id = await pc.readContract({
        address: REGISTRY_CS,
        abi: ProfileRegistry as any,
        functionName: "getIdByHandle",
        args: [handle],
      })
      if (typeof id === "bigint" && id > 0n) return id
    } catch {
      /* fall through to getProfileByHandle shape */
    }

    const prof = await pc.readContract({
      address: REGISTRY_CS,
      abi: ProfileRegistry as any,
      functionName: "getProfileByHandle",
      args: [handle],
    })
    if (typeof prof === "bigint") return prof
    if (Array.isArray(prof)) {
      // find any bigint field > 0n (some ABIs return (exists, id, ...))
      const candidate = (prof as any[]).find((v) => typeof v === "bigint" && v > 0n)
      return (candidate as bigint) || 0n
    }
  } catch {}
  return 0n
}

/** All profile IDs owned by an address. */
export async function getProfilesByOwner(owner: `0x${string}`): Promise<bigint[]> {
  if (!REGISTRY_CS || !owner) return []
  try {
    const out = await pc.readContract({
      address: REGISTRY_CS,
      abi: ProfileRegistry as any,
      functionName: "getProfilesByOwner",
      args: [owner],
    })
    return (Array.isArray(out) ? (out as bigint[]) : []) ?? []
  } catch {
    return []
  }
}

/** Flat, paginated listing. */
export async function listProfilesFlat(cursor: bigint = 0n, size: bigint = 12n) {
  if (!REGISTRY_CS) return undefined
  try {
    const res = await pc.readContract({
      address: REGISTRY_CS,
      abi: ProfileRegistry as any,
      functionName: "listProfilesFlat",
      args: [cursor, size],
    })
    return res as unknown as {
      0: bigint[]  // ids
      1: `0x${string}`[] // owners
      2: string[]  // handles
      3: string[]  // displayNames
      4: string[]  // avatars
      5: string[]  // bios
      6: bigint[]  // fids
      7: bigint[]  // createdAts
      8: bigint    // nextCursor
    }
  } catch {
    return undefined
  }
}

/* ─────────────────────────────── READ HOOKS ──────────────────────────────── */

/** Paginated flat listing: ids, owners, handles, names, avatars, bios, fids, createdAts, nextCursor */
export function useListProfiles(cursor: bigint = 0n, size: bigint = 12n, opts?: WatchOpts) {
  const enabled = !!REGISTRY_CS
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
    functionName: "listProfilesFlat",
    args: enabled ? [cursor, size] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Single profile by id -> (owner_, handle_, displayName_, avatarURI_, bio_, fid_, createdAt_) */
export function useGetProfile(id?: bigint, opts?: WatchOpts) {
  const enabled = !!REGISTRY_CS && !!id && id > 0n
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
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
  const enabled = !!REGISTRY_CS && !!ids && ids.length > 0
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
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
  const enabled = !!REGISTRY_CS && !!handle
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
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
  const enabled = !!REGISTRY_CS && !!handle
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
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
  const enabled = !!REGISTRY_CS && !!owner
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
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
  const enabled = !!REGISTRY_CS && !!handle
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
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
  const enabled = !!REGISTRY_CS && !!handle
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
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
  const enabled = !!REGISTRY_CS
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
    functionName: "feeInfo",
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Flat fee units only (e.g., 500_000 for $0.50 with 6dp USDC) */
export function useFeeUnits(opts?: WatchOpts) {
  const enabled = !!REGISTRY_CS
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
    functionName: "feeUnits",
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Next profile id (monotonic) */
export function useNextId(opts?: WatchOpts) {
  const enabled = !!REGISTRY_CS
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
    functionName: "nextId",
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Total profiles created */
export function useProfileCount(opts?: WatchOpts) {
  const enabled = !!REGISTRY_CS
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
    functionName: "profileCount",
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/** Preview create for connected user -> (balance, allowance_, fee, okBalance, okAllowance) */
export function usePreviewCreate(user?: `0x${string}`, opts?: WatchOpts) {
  const { address } = useAccount()
  const who = (user ?? address) as `0x${string}` | undefined
  const enabled = !!REGISTRY_CS && !!who
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY_CS,
    functionName: "previewCreate",
    args: enabled ? [who as `0x${string}`] : undefined,
    query: {
      enabled,
      refetchInterval: opts?.watch ? REFRESH_MS : false,
    },
  })
}

/* ────────────────────────────── WRITE HOOKS ─────────────────────────────── */

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
    if (!REGISTRY_CS) throw new Error("Missing registry address.")
    if (!address) throw new Error("Connect your wallet to create a profile.")
    const hash = await writeContractAsync({
      abi: ProfileRegistry as any,
      address: REGISTRY_CS,
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
    if (!REGISTRY_CS) throw new Error("Missing registry address.")
    if (!address) throw new Error("Connect your wallet to update a profile.")
    const hash = await writeContractAsync({
      abi: ProfileRegistry as any,
      address: REGISTRY_CS,
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
    if (!REGISTRY_CS) throw new Error("Missing registry address.")
    if (!address) throw new Error("Connect your wallet to change handle.")
    const hash = await writeContractAsync({
      abi: ProfileRegistry as any,
      address: REGISTRY_CS,
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
    if (!REGISTRY_CS) throw new Error("Missing registry address.")
    if (!address) throw new Error("Connect your wallet to transfer a profile.")
    const hash = await writeContractAsync({
      abi: ProfileRegistry as any,
      address: REGISTRY_CS,
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
