// lib/profileRegistry/reads.ts
import type { Abi, Address } from 'viem'
import { readClient } from './constants'
import { PROFILE_REGISTRY_ABI } from './abi'
import { BASE_USDC, REGISTRY_ADDRESS } from './constants'

const ERC20_MINI = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const satisfies Abi

const isZero = (a?: string) => !a || /^0x0{40}$/i.test(a?.slice(2) ?? '')

export function normalizeHandle(h = '') {
  return h.trim().replace(/^@+/, '').toLowerCase()
}

export function registryAvailable(): boolean {
  return !isZero(REGISTRY_ADDRESS)
}

export async function readHandleTaken(handle: string): Promise<boolean> {
  if (!registryAvailable()) return false
  try {
    const ok = (await readClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: PROFILE_REGISTRY_ABI,
      functionName: 'handleTaken',
      args: [normalizeHandle(handle)],
    })) as boolean
    return !!ok
  } catch {
    return false
  }
}

export async function readIdByHandle(handle: string): Promise<bigint> {
  if (!registryAvailable()) return 0n
  const h = normalizeHandle(handle)
  try {
    const id = (await readClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: PROFILE_REGISTRY_ABI,
      functionName: 'getIdByHandle',
      args: [h],
    })) as bigint
    return id ?? 0n
  } catch {
    try {
      const r = (await readClient.readContract({
        address: REGISTRY_ADDRESS,
        abi: PROFILE_REGISTRY_ABI,
        functionName: 'getProfileByHandle',
        args: [h],
      })) as any[]
      const exists = Boolean(r?.[0])
      const idMaybe = exists ? BigInt(r?.[1] || 0) : 0n
      return idMaybe
    } catch {
      return 0n
    }
  }
}

export async function readProfilesByOwner(owner: Address): Promise<bigint[]> {
  if (!registryAvailable()) return []
  try {
    const ids = (await readClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: PROFILE_REGISTRY_ABI,
      functionName: 'getProfilesByOwner',
      args: [owner],
    })) as bigint[]
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

export async function readProfileFlat(id: bigint) {
  if (!registryAvailable() || !id) return null
  try {
    const r = (await readClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: PROFILE_REGISTRY_ABI,
      functionName: 'getProfile',
      args: [id],
    })) as any
    if (!r) return null
    const owner = r[0] as Address
    const handle = String(r[1] || '')
    const displayName = String(r[2] || '')
    const avatarURI = String(r[3] || '')
    const bio = String(r[4] || '')
    const fid = BigInt(r[5] || 0n)
    const createdAtSec = BigInt(r[6] || 0n)

    return {
      id,
      owner,
      handle,
      displayName,
      avatarURI,
      bio,
      fid,
      createdAt: Number(createdAtSec) * 1000,
    }
  } catch {
    return null
  }
}

export async function readProfilesFlat(ids: readonly bigint[]) {
  const tasks = (ids || []).map((id) => readProfileFlat(id))
  const out = await Promise.all(tasks)
  return out.filter(Boolean) as NonNullable<Awaited<ReturnType<typeof readProfileFlat>>>[]
}

/** Back-compat alias expected by /app/api/creators/route.ts */
export const listProfilesFlat = readProfilesFlat

/** Creation fee + USDC allowance preview */
export async function readPreviewCreate(owner: Address): Promise<{ fee: bigint; okAllowance: boolean } | null> {
  if (!registryAvailable()) return null
  try {
    const fee = (await readClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: PROFILE_REGISTRY_ABI,
      functionName: 'feeUnits',
      args: [],
    })) as bigint

    if (!fee || fee === 0n) return { fee: 0n, okAllowance: true }

    const allowance = (await readClient.readContract({
      address: BASE_USDC,
      abi: ERC20_MINI,
      functionName: 'allowance',
      args: [owner, REGISTRY_ADDRESS],
    })) as bigint

    return { fee, okAllowance: (allowance ?? 0n) >= fee }
  } catch {
    return null
  }
}
