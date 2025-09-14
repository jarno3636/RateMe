// lib/profileRegistry/reads.ts
import { createPublicClient, http, type PublicClient } from 'viem';
import { base as BASE } from 'viem/chains';
import type { Abi, Address } from 'viem';
import { PROFILE_REGISTRY_ABI } from './abi';
import { REGISTRY_ADDRESS } from './constants';

function getClient(): PublicClient {
  const rpc =
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    process.env.BASE_RPC_URL ||
    undefined;
  return createPublicClient({ chain: BASE, transport: http(rpc) });
}

/** Shape used by `/app/api/creators/route.ts` mapChainToCreator */
export type FlatProfile = {
  id: bigint;
  owner: `0x${string}`;
  handle: string;
  displayName: string;
  avatarURI: string;
  bio: string;
  fid: bigint;
  createdAt: bigint; // seconds on-chain
};

/** ------------------------------- Helpers -------------------------------- */
function normalizeFlatTuple(tuple: [
  bigint[],            // outIds
  `0x${string}`[],     // owners
  string[],            // handles
  string[],            // displayNames
  string[],            // avatarURIs
  string[],            // bios
  bigint[],            // fids
  bigint[]             // createdAts (seconds)
]): FlatProfile[] {
  const outIds = tuple[0];
  const owners = tuple[1];
  const handles = tuple[2];
  const displayNames = tuple[3];
  const avatarURIs = tuple[4];
  const bios = tuple[5];
  const fids = tuple[6];
  const createdAts = tuple[7];

  return outIds.map((id, i) => ({
    id,
    owner: owners[i],
    handle: handles[i] || '',
    displayName: displayNames[i] || '',
    avatarURI: avatarURIs[i] || '',
    bio: bios[i] || '',
    fid: fids[i] ?? 0n,
    createdAt: createdAts[i] ?? 0n, // seconds
  }));
}

/** ------------------------ readProfilesFlat (overloaded) ------------------ */
/**
 * Overload A: readProfilesFlat(ids) -> resolves an array of FlatProfile for explicit IDs.
 * Overload B: readProfilesFlat(cursor, size) -> resolves a page { items, nextCursor } for pagination.
 */
export function readProfilesFlat(ids: bigint[], client?: PublicClient): Promise<FlatProfile[]>;
export function readProfilesFlat(cursor: bigint, size: bigint, client?: PublicClient): Promise<{ items: FlatProfile[]; nextCursor: bigint | null }>;
export async function readProfilesFlat(a: bigint[] | bigint, b?: bigint | PublicClient, c?: PublicClient) {
  // Detect signature
  if (Array.isArray(a)) {
    // Overload A: ids[]
    const ids = a;
    const client = (b as PublicClient) ?? getClient();
    const tuple = await client.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfilesFlat',
      args: [ids],
    }) as [
      bigint[], `0x${string}`[], string[], string[], string[], string[], bigint[], bigint[]
    ];
    return normalizeFlatTuple(tuple);
  } else {
    // Overload B: (cursor, size)
    const cursor = a as bigint;
    const size = b as bigint;
    const client = c ?? getClient();
    const page = await client.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'listProfilesFlat',
      args: [cursor, size],
    }) as [
      bigint[], `0x${string}`[], string[], string[], string[], string[], bigint[], bigint[], bigint
    ];

    const items = normalizeFlatTuple(page.slice(0, 8) as unknown as [
      bigint[], `0x${string}`[], string[], string[], string[], string[], bigint[], bigint[]
    ]);
    const nextCursor = page[8] ?? 0n;
    return { items, nextCursor: nextCursor > 0n ? nextCursor : null };
  }
}

/** ----------------------------- previewCreate ----------------------------- */
export async function readPreviewCreate(user: Address, client?: PublicClient) {
  const c = client ?? getClient();
  try {
    const [balance, allowance, fee, okBalance, okAllowance] = await c.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'previewCreate',
      args: [user],
    }) as [bigint, bigint, bigint, boolean, boolean];
    return { balance, allowance, fee, okBalance, okAllowance };
  } catch {
    return null;
  }
}

/** If someone still wants a client */
export const readClient = getClient();
