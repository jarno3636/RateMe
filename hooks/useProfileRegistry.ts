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

import { PROFILE_REGISTRY_ABI } from '@/lib/profileRegistry/abi';
import {
  REGISTRY_ADDRESS as PROFILE_REGISTRY_ADDR,
  USDC_ADDRESS as BASE_USDC,
  BASE_CHAIN_ID,
  ZERO_ADDRESS,
  registryConfigured,
} from '@/lib/profileRegistry/constants';

/* ------------------------------------------------------------------ */
/* Minimal ERC20 for allowance/approve                                 */
/* ------------------------------------------------------------------ */
const ERC20_ABI = [
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
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const satisfies Abi;

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */
function normalizeHandle(s: string) {
  return s.trim().replace(/^@+/, '').toLowerCase();
}
function asAddr(s: string | undefined | null): Address {
  if (!s) throw new Error('Missing address');
  return getAddress(s as `0x${string}`) as Address;
}
function req<T>(v: T | undefined | null, msg: string): T {
  if (v === undefined || v === null) throw new Error(msg);
  return v as T;
}

/* Pre-validated addresses (throws early in dev if misconfigured) */
const REG = asAddr(PROFILE_REGISTRY_ADDR);
const USDC = asAddr(BASE_USDC);

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */
export function useProfileRegistry() {
  const { address, chainId } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const assertConfigured = () => {
    if (!pub) throw new Error('Public client unavailable');
    if (!registryConfigured) {
      throw new Error('ProfileRegistry not configured. Check constants/env.');
    }
    if (!REG || REG === (ZERO_ADDRESS as Address)) {
      throw new Error('ProfileRegistry address invalid.');
    }
    if (!USDC || USDC === (ZERO_ADDRESS as Address)) {
      throw new Error('USDC address invalid for Base.');
    }
  };

  const ensureBase = useCallback(async () => {
    if (!wallet?.account) throw new Error('Connect wallet');
    if (chainId !== BASE_CHAIN_ID) {
      if (!switchChainAsync) throw new Error('Wrong network. Switch to Base.');
      await switchChainAsync({ chainId: BASE_CHAIN_ID });
    }
  }, [wallet, chainId, switchChainAsync]);

  /* -------------------------- Reads -------------------------- */

  /** feeUnits() */
  const feeUnits = useCallback(async (): Promise<bigint> => {
    assertConfigured();
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'feeUnits',
    })) as bigint;
  }, [pub]);

  /** handleTaken(handle) */
  const handleTaken = useCallback(async (raw: string): Promise<boolean> => {
    assertConfigured();
    const handle = normalizeHandle(raw);
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'handleTaken',
      args: [handle],
    })) as boolean;
  }, [pub]);

  /** getIdByHandle(handle) */
  const getIdByHandle = useCallback(async (raw: string): Promise<bigint> => {
    assertConfigured();
    const handle = normalizeHandle(raw);
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getIdByHandle',
      args: [handle],
    })) as bigint;
  }, [pub]);

  /** canRegister(handle) -> {ok, reason} (helpful UX) */
  const canRegister = useCallback(
    async (raw: string): Promise<{ ok: boolean; reason: string }> => {
      assertConfigured();
      const handle = normalizeHandle(raw);
      const [ok, reason] = (await pub!.readContract({
        address: REG,
        abi: PROFILE_REGISTRY_ABI as Abi,
        functionName: 'canRegister',
        args: [handle],
      })) as unknown as [boolean, string];
      return { ok, reason };
    },
    [pub]
  );

  /**
   * preview() — prefers contract’s previewCreate(user) when present,
   * otherwise falls back to USDC allowance + feeUnits().
   */
  const preview = useCallback(
    async (user: Address) => {
      assertConfigured();

      // Try previewCreate(user)
      try {
        const [balance, allowance_, fee, okBalance, okAllowance] = (await pub!.readContract({
          address: REG,
          abi: PROFILE_REGISTRY_ABI as Abi,
          functionName: 'previewCreate',
          args: [user],
        })) as unknown as [bigint, bigint, bigint, boolean, boolean];

        return {
          fee,
          allowance: allowance_,
          okAllowance,
          balance,
          okBalance,
        };
      } catch {
        // Fallback: fee + ERC20 allowance only
        const fee = await feeUnits().catch(() => 0n);
        const allowance = (await pub!.readContract({
          address: USDC,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [user, REG],
        })) as bigint;
        return {
          fee,
          allowance,
          okAllowance: fee === 0n ? true : allowance >= fee,
        };
      }
    },
    [pub, feeUnits]
  );

  /* -------------------------- Writes -------------------------- */

  /** Ensure USDC approval for `needed` (infinite by default for smooth UX) */
  const ensureUSDCApproval = useCallback(
    async (needed: bigint, opts?: { infinite?: boolean }) => {
      assertConfigured();
      await ensureBase();

      const owner = req(address, 'No wallet address');
      const allowance = (await pub!.readContract({
        address: USDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, REG],
      })) as bigint;

      if (allowance >= needed) return;

      const amount = opts?.infinite !== false ? (2n ** 256n - 1n) : needed;

      const { request } = await pub!.simulateContract({
        address: USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [REG, amount],
        account: wallet!.account,
        chain: pub!.chain,
      });

      const hash = await wallet!.writeContract(request);
      await pub!.waitForTransactionReceipt({ hash });
    },
    [address, pub, wallet, ensureBase]
  );

  /** createProfile(...) with on-chain validation (canRegister) */
  const createProfile = useCallback(
    async (params: {
      handle: string;
      displayName?: string;
      avatarURI?: string;
      bio?: string;
      fid?: number | bigint;
      /** default true — set to false to approve exact fee */
      infiniteApproval?: boolean;
    }) => {
      assertConfigured();
      await ensureBase();

      const handle = normalizeHandle(params.handle);
      if (!/^[a-z0-9._-]{3,32}$/.test(handle)) {
        throw new Error('Invalid handle format');
      }

      // Rich validation with reason
      const can = await canRegister(handle);
      if (!can.ok) throw new Error(can.reason || 'Handle is not available');

      const fee = await feeUnits();
      if (fee > 0n) {
        await ensureUSDCApproval(fee, { infinite: params.infiniteApproval !== false });
      }

      const { request } = await pub!.simulateContract({
        address: REG,
        abi: PROFILE_REGISTRY_ABI as Abi,
        functionName: 'createProfile',
        args: [
          handle,
          params.displayName ?? '',
          params.avatarURI ?? '',
          params.bio ?? '',
          BigInt(params.fid ?? 0),
        ],
        account: wallet!.account,
        chain: pub!.chain,
      });

      const txHash = await wallet!.writeContract(request);
      await pub!.waitForTransactionReceipt({ hash: txHash });

      const id = await getIdByHandle(handle);
      return { txHash, id };
    },
    [pub, wallet, ensureBase, ensureUSDCApproval, feeUnits, canRegister, getIdByHandle]
  );

  /** Optional extra: changeHandle(id, newHandle) */
  const changeHandle = useCallback(
    async (id: bigint, newHandle: string) => {
      assertConfigured();
      await ensureBase();

      const h = normalizeHandle(newHandle);
      if (!/^[a-z0-9._-]{3,32}$/.test(h)) throw new Error('Invalid handle format');

      const can = await canRegister(h);
      if (!can.ok) throw new Error(can.reason || 'Handle is not available');

      const { request } = await pub!.simulateContract({
        address: REG,
        abi: PROFILE_REGISTRY_ABI as Abi,
        functionName: 'changeHandle',
        args: [id, h],
        account: wallet!.account,
        chain: pub!.chain,
      });

      const hash = await wallet!.writeContract(request);
      await pub!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [pub, wallet, ensureBase, canRegister]
  );

  /** Optional extra: updateProfile fields */
  const updateProfile = useCallback(
    async (
      id: bigint,
      data: { displayName?: string; avatarURI?: string; bio?: string; fid?: number | bigint }
    ) => {
      assertConfigured();
      await ensureBase();

      const { request } = await pub!.simulateContract({
        address: REG,
        abi: PROFILE_REGISTRY_ABI as Abi,
        functionName: 'updateProfile',
        args: [
          id,
          data.displayName ?? '',
          data.avatarURI ?? '',
          data.bio ?? '',
          BigInt(data.fid ?? 0),
        ],
        account: wallet!.account,
        chain: pub!.chain,
      });

      const hash = await wallet!.writeContract(request);
      await pub!.waitForTransactionReceipt({ hash });
      return hash;
    },
    [pub, wallet, ensureBase]
  );

  return {
    // reads
    feeUnits,
    handleTaken,
    getIdByHandle,
    canRegister,
    preview,
    // writes
    createProfile,
    changeHandle,
    updateProfile,
    ensureUSDCApproval,
  };
}
