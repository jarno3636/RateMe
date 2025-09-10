// hooks/useProfileRegistry.ts
'use client';

import { useCallback } from 'react';
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
} from 'wagmi';
import type { Address, Abi } from 'viem';
import { getAddress } from 'viem';
import { base } from 'viem/chains';
import {
  PROFILE_REGISTRY_ABI,
  PROFILE_REGISTRY_ADDR,
  BASE_USDC,
} from '@/lib/registry';

// Minimal ERC20 ABI for allowance/approve
const ERC20_ABI = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const satisfies Abi;

const ZERO = '0x0000000000000000000000000000000000000000' as const;
const BASE_CHAIN_ID = base.id;

// Normalize to checksummed Address early; throws if malformed.
function asAddr(s: string | undefined | null): Address {
  if (!s) throw new Error('Missing address');
  return getAddress(s as `0x${string}`) as Address;
}
const REG = asAddr(PROFILE_REGISTRY_ADDR);
const USDC = asAddr(BASE_USDC);

function req<T>(v: T | undefined | null, msg: string): T {
  if (v === undefined || v === null) throw new Error(msg);
  return v as T;
}
function normalizeHandle(s: string) {
  return s.trim().replace(/^@/, '').toLowerCase();
}

export function useProfileRegistry() {
  const { address, chainId } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const assertAddresses = () => {
    if (!pub) throw new Error('Public client unavailable');
    if (!REG || REG === (ZERO as Address)) {
      throw new Error(
        'Profile Registry address is not configured. Set NEXT_PUBLIC_PROFILE_REGISTRY_ADDR to a checksummed address.'
      );
    }
    if (!USDC || USDC === (ZERO as Address)) {
      throw new Error(
        'USDC address is not configured for Base. Check NEXT_PUBLIC_BASE_USDC.'
      );
    }
  };

  const ensureBase = useCallback(async () => {
    if (!wallet?.account) throw new Error('Connect wallet');
    if (chainId !== BASE_CHAIN_ID) {
      if (!switchChainAsync) throw new Error('Wrong network. Please switch to Base.');
      await switchChainAsync({ chainId: BASE_CHAIN_ID });
    }
  }, [wallet, chainId, switchChainAsync]);

  // ---------- Reads ----------
  const feeUnits = useCallback(async (): Promise<bigint> => {
    assertAddresses();
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'feeUnits',
    })) as bigint;
  }, [pub]);

  const handleTaken = useCallback(async (raw: string): Promise<boolean> => {
    assertAddresses();
    const handle = normalizeHandle(raw);
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'handleTaken',
      args: [handle],
    })) as boolean;
  }, [pub]);

  const getIdByHandle = useCallback(async (raw: string): Promise<bigint> => {
    assertAddresses();
    const handle = normalizeHandle(raw);
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getIdByHandle',
      args: [handle],
    })) as bigint;
  }, [pub]);

  const preview = useCallback(
    async (user: Address) => {
      assertAddresses();
      const fee = await feeUnits().catch(() => 0n);
      const allowance = (await pub!.readContract({
        address: USDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [user, REG],
      })) as bigint;
      return { fee, allowance, okAllowance: fee === 0n ? true : allowance >= fee };
    },
    [pub, feeUnits]
  );

  // ---------- Writes ----------
  const ensureUSDCApproval = useCallback(
    async (needed: bigint, opts?: { infinite?: boolean }) => {
      assertAddresses();
      await ensureBase();

      const owner = req(address, 'No wallet address');
      const allowance = (await pub!.readContract({
        address: USDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, REG],
      })) as bigint;

      if (allowance >= needed) return;

      const amount = opts?.infinite ? (2n ** 256n - 1n) : needed;

      const { request } = await pub!.simulateContract({
        address: USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [REG, amount],
        account: wallet!.account,
      });

      const hash = await wallet!.writeContract(request);
      await pub!.waitForTransactionReceipt({ hash });
    },
    [address, pub, wallet, ensureBase]
  );

  const createProfile = useCallback(
    async (params: {
      handle: string;
      displayName?: string;
      avatarURI?: string;
      bio?: string;
      fid?: number;
    }) => {
      assertAddresses();
      await ensureBase();

      const handle = normalizeHandle(params.handle);
      if (!/^[a-z0-9._-]{3,32}$/.test(handle)) {
        throw new Error('Invalid handle format');
      }
      if (await handleTaken(handle)) throw new Error('Handle already registered');

      const fee = await feeUnits();
      if (fee > 0n) await ensureUSDCApproval(fee, { infinite: true });

      const { request } = await pub!.simulateContract({
        address: REG,
        abi: PROFILE_REGISTRY_ABI as Abi,
        functionName: 'createProfile',
        args: [
          handle,
          params.displayName || '',
          params.avatarURI || '',
          params.bio || '',
          BigInt(params.fid ?? 0),
        ],
        account: wallet!.account,
      });

      const txHash = await wallet!.writeContract(request);
      await pub!.waitForTransactionReceipt({ hash: txHash });

      const id = await getIdByHandle(handle);
      return { txHash, id };
    },
    [pub, wallet, ensureBase, ensureUSDCApproval, feeUnits, handleTaken, getIdByHandle]
  );

  return { feeUnits, handleTaken, getIdByHandle, preview, createProfile };
}
