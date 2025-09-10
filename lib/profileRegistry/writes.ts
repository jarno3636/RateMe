// lib/profileRegistry/writes.ts
import type { Abi, Address, WalletClient, PublicClient } from 'viem';
import { getAddress, isAddress } from 'viem';

import { PROFILE_REGISTRY_ABI } from './abi';
import {
  REGISTRY_ADDRESS,
  USDC_ADDRESS,
  BASE_CHAIN_ID,
  ZERO_ADDRESS,
  registryConfigured,
} from './constants';

/* ----------------------------------------------------------- */
/* Minimal ERC20 ABI for approvals                              */
/* ----------------------------------------------------------- */
const ERC20_MINI_ABI = [
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [
      { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }
    ], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [
      { name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }
    ], outputs: [{ type: 'bool' }] },
] as const satisfies Abi;

/* ----------------------------------------------------------- */
/* Types                                                       */
/* ----------------------------------------------------------- */
export type Clients = {
  pub: PublicClient;
  wallet: WalletClient;
};

type CreateProfileArgs = {
  handle: string;
  displayName?: string;
  avatarURI?: string;
  bio?: string;
  fid?: number | bigint;
  /**
   * If true, approval sets MaxUint256. Default: true (gas-savvy UX).
   */
  infiniteApproval?: boolean;
};

/* ----------------------------------------------------------- */
/* Guards                                                      */
/* ----------------------------------------------------------- */
function ensureConfigured() {
  if (!registryConfigured || !isAddress(REGISTRY_ADDRESS) || REGISTRY_ADDRESS === ZERO_ADDRESS) {
    throw new Error('ProfileRegistry address not configured');
  }
  if (!isAddress(USDC_ADDRESS) || USDC_ADDRESS === ZERO_ADDRESS) {
    throw new Error('USDC token address not configured');
  }
}

function normalizeHandle(input: string) {
  return String(input).trim().replace(/^@+/, '').toLowerCase();
}

/* ----------------------------------------------------------- */
/* Reads used by writes                                        */
/* ----------------------------------------------------------- */
export async function readFeeUnits(pub: PublicClient): Promise<bigint> {
  ensureConfigured();
  return (await pub.readContract({
    address: REGISTRY_ADDRESS,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'feeUnits',
  })) as bigint;
}

export async function readIdByHandle(pub: PublicClient, handle: string): Promise<bigint> {
  ensureConfigured();
  return (await pub.readContract({
    address: REGISTRY_ADDRESS,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'getIdByHandle',
    args: [handle],
  })) as bigint;
}

export async function readCanRegister(pub: PublicClient, handle: string): Promise<{ ok: boolean; reason: string }> {
  ensureConfigured();
  const [ok, reason] = (await pub.readContract({
    address: REGISTRY_ADDRESS,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'canRegister',
    args: [handle],
  })) as unknown as [boolean, string];
  return { ok, reason };
}

/* ----------------------------------------------------------- */
/* Approval helper                                             */
/* ----------------------------------------------------------- */
export async function ensureUSDCApproval(
  { pub, wallet }: Clients,
  needed: bigint,
  opts?: { infinite?: boolean }
): Promise<`0x${string}` | null> {
  ensureConfigured();
  if (!wallet?.account) throw new Error('Connect wallet');

  // Optional chain guard (lightweight; callers can switch before invoking)
  const chainId = (await pub.getChainId?.()) ?? pub.chain?.id;
  if (chainId && chainId !== BASE_CHAIN_ID) {
    throw new Error('Wrong network — please switch to Base');
  }

  const owner = wallet.account.address as Address;

  const allowance = (await pub.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_MINI_ABI as Abi,
    functionName: 'allowance',
    args: [owner, REGISTRY_ADDRESS as Address],
  })) as bigint;

  if (allowance >= needed) return null;

  const MaxUint256 = (2n ** 256n - 1n);
  const amount = opts?.infinite !== false ? MaxUint256 : needed;

  const { request } = await pub.simulateContract({
    address: USDC_ADDRESS,
    abi: ERC20_MINI_ABI as Abi,
    functionName: 'approve',
    args: [REGISTRY_ADDRESS as Address, amount],
    account: wallet.account,
    chain: pub.chain,
  });

  const hash = await wallet.writeContract(request);
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

/* ----------------------------------------------------------- */
/* Main write: createProfile                                   */
/* ----------------------------------------------------------- */
export async function createProfile(
  clients: Clients,
  args: CreateProfileArgs
): Promise<{ txHash: `0x${string}`; id: bigint }> {
  ensureConfigured();
  const { pub, wallet } = clients;
  if (!wallet?.account) throw new Error('Connect wallet');

  // Normalize & validate handle with on-chain preflight
  const handle = normalizeHandle(args.handle);
  if (!/^[a-z0-9._-]{3,32}$/.test(handle)) {
    throw new Error('Invalid handle format');
  }
  const can = await readCanRegister(pub, handle);
  if (!can.ok) throw new Error(can.reason || 'Handle is not available');

  // Fetch fee and approve as needed
  const fee = await readFeeUnits(pub);
  await ensureUSDCApproval(clients, fee, { infinite: args.infiniteApproval !== false });

  // Simulate & submit createProfile
  const { request } = await pub.simulateContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'createProfile',
    args: [
      handle,
      args.displayName ?? '',
      args.avatarURI ?? '',
      args.bio ?? '',
      BigInt(args.fid ?? 0),
    ],
    account: wallet.account,
    chain: pub.chain,
  });

  const txHash = await wallet.writeContract(request);
  await pub.waitForTransactionReceipt({ hash: txHash });

  // Resolve profile id deterministically
  const id = await readIdByHandle(pub, handle);
  return { txHash, id };
}

/* ----------------------------------------------------------- */
/* Bonus writes: update & changeHandle                         */
/* ----------------------------------------------------------- */
export async function updateProfile(
  { pub, wallet }: Clients,
  id: bigint,
  data: { displayName?: string; avatarURI?: string; bio?: string; fid?: number | bigint }
): Promise<`0x${string}`> {
  ensureConfigured();
  if (!wallet?.account) throw new Error('Connect wallet');

  const { request } = await pub.simulateContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'updateProfile',
    args: [
      id,
      data.displayName ?? '',
      data.avatarURI ?? '',
      data.bio ?? '',
      BigInt(data.fid ?? 0),
    ],
    account: wallet.account,
    chain: pub.chain,
  });

  const hash = await wallet.writeContract(request);
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

export async function changeHandle(
  { pub, wallet }: Clients,
  id: bigint,
  newHandle: string
): Promise<`0x${string}`> {
  ensureConfigured();
  if (!wallet?.account) throw new Error('Connect wallet');

  const h = normalizeHandle(newHandle);
  if (!/^[a-z0-9._-]{3,32}$/.test(h)) {
    throw new Error('Invalid handle format');
  }
  const can = await readCanRegister(pub, h);
  if (!can.ok) throw new Error(can.reason || 'Handle is not available');

  const { request } = await pub.simulateContract({
    address: REGISTRY_ADDRESS as Address,
    abi: PROFILE_REGISTRY_ABI as Abi,
    functionName: 'changeHandle',
    args: [id, h],
    account: wallet.account,
    chain: pub.chain,
  });

  const hash = await wallet.writeContract(request);
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}
