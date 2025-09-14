// hooks/useProfileRegistry.ts
'use client';

import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  isAddress,
  type Address,
} from 'viem';
import { useAccount, useWalletClient } from 'wagmi';
import { base as BASE } from 'viem/chains';
import {
  BASE_CHAIN_ID,
  PROFILE_REGISTRY_ADDR,
  PROFILE_REGISTRY_ABI,
  USDC_ADDRESS,
  ZERO_ADDRESS,
  registryConfigured,
} from '@/lib/profileRegistry/constants';
import {
  readIdByHandle as _readIdByHandle,
  getProfile as _getProfile,
  getProfileByHandle as _getProfileByHandle,
  readProfilesByOwner as _readProfilesByOwner,
  listProfilesFlat as _listProfilesFlat,
  readPreviewCreate as _readPreviewCreate,
  handleTaken as _handleTaken,
  feeUnits as _feeUnits,
} from '@/lib/profileRegistry/reads';

/** Minimal ERC20 ABI for approve/allowance */
const ERC20_ABI = [
  { type: 'function', stateMutability: 'view', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'nonpayable', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const;

const rpc =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.BASE_RPC_URL ||
  undefined;

const pub = createPublicClient({ chain: BASE, transport: http(rpc) });

export function useProfileRegistry() {
  const { chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  const onBase = chainId === BASE_CHAIN_ID;

  async function ensureWallet() {
    if (!walletClient) throw new Error('Wallet not connected');
    if (!registryConfigured) throw new Error('Profile Registry not configured');
    return walletClient;
    // NOTE: we rely on wagmi to connect to the right chain;
    // optionally, you can prompt chain switch here.
  }

  /** ----------- READS (thin wrappers around lib/profileRegistry/reads) ----------- */
  const readIdByHandle = _readIdByHandle;
  const getProfile = _getProfile;
  const getProfileByHandle = _getProfileByHandle;
  const readProfilesByOwner = _readProfilesByOwner;
  const listProfilesFlat = _listProfilesFlat;
  const previewCreate = _readPreviewCreate;
  const handleTaken = _handleTaken;
  const feeUnits = _feeUnits;

  /** ----------- WRITES ----------- */
  async function createProfile(input: {
    handle: string;
    displayName: string;
    avatarURI: string;
    bio: string;
    fid: bigint | number;
  }): Promise<bigint> {
    const wc = await ensureWallet();
    const acct = wc.account?.address;
    if (!acct) throw new Error('Missing account');

    // Check allowance via previewCreate and top up if needed
    const preview = await _readPreviewCreate(getAddress(acct));
    const need = preview.fee;
    if (need > 0n && !preview.okAllowance) {
      // Approve exact fee (or you can approve a larger buffer if desired)
      await wc.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [PROFILE_REGISTRY_ADDR, need],
      });
    }

    const fidBig = typeof input.fid === 'number' ? BigInt(input.fid) : input.fid;

    const id = (await wc.writeContract({
      address: PROFILE_REGISTRY_ADDR,
      abi: PROFILE_REGISTRY_ABI,
      functionName: 'createProfile',
      args: [
        input.handle,
        input.displayName,
        input.avatarURI,
        input.bio,
        fidBig,
      ],
    })) as unknown as bigint; // wagmi returns tx hash; viem writeContract returns tx hash; but with walletClient it returns hash. We’ll wait for receipt below.

    // Wait for inclusion/confirmation
    const hash = id as unknown as `0x${string}`;
    const receipt = await pub.waitForTransactionReceipt({ hash });

    // Optional: fetch nextId-1 or re-query by handle to obtain the new id
    const found = await _getProfileByHandle(input.handle);
    if (found.exists) return found.profile!.id;

    // Fallback: try getIdByHandle
    const newId = await _readIdByHandle(input.handle).catch(() => 0n);
    if (newId && newId > 0n) return newId;

    throw new Error('Profile created but could not resolve new id yet');
  }

  return {
    // meta
    baseChainId: BASE_CHAIN_ID,
    usdc: USDC_ADDRESS,
    zero: ZERO_ADDRESS,
    onBase,
    configured: registryConfigured,

    // reads
    readIdByHandle,
    getProfile,
    getProfileByHandle,
    readProfilesByOwner,
    listProfilesFlat,
    previewCreate,
    handleTaken,
    feeUnits,

    // writes
    createProfile,
  };
}
