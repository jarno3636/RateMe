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
import {
  PROFILE_REGISTRY_ABI,
  PROFILE_REGISTRY_ADDR,
  BASE_USDC,
  USDC_ABI,
  BASE_CHAIN_ID,
} from '@/lib/registry';

const REG = PROFILE_REGISTRY_ADDR as Address;
const USDC = BASE_USDC as Address;

function req<T>(v: T | undefined, msg: string): T {
  if (v === undefined || v === null) throw new Error(msg);
  return v as T;
}

export function useProfileRegistry() {
  const { address, chainId } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const ensureBase = useCallback(async () => {
    if (!wallet?.account) throw new Error('Connect wallet');
    if (chainId !== BASE_CHAIN_ID) {
      await switchChainAsync?.({ chainId: BASE_CHAIN_ID });
    }
  }, [wallet, chainId, switchChainAsync]);

  const assert = () => {
    if (!pub) throw new Error('Public client unavailable');
    if (!wallet?.account) throw new Error('Connect wallet');
    if (!REG || !USDC) throw new Error('Contract addresses not configured');
  };

  // ---------- Reads ----------
  const feeUnits = useCallback(async (): Promise<bigint> => {
    req(pub, 'Public client unavailable');
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'feeUnits',
    })) as bigint;
  }, [pub]);

  const handleTaken = useCallback(async (handle: string): Promise<boolean> => {
    req(pub, 'Public client unavailable');
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'handleTaken',
      args: [handle],
    })) as boolean;
  }, [pub]);

  const getIdByHandle = useCallback(async (handle: string): Promise<bigint> => {
    req(pub, 'Public client unavailable');
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getIdByHandle',
      args: [handle],
    })) as bigint;
  }, [pub]);

  // Nice-to-have: single RPC that mirrors your contract's preview
  const preview = useCallback(async (user: Address) => {
    req(pub, 'Public client unavailable');
    const fee = await feeUnits();
    const allowance = (await pub!.readContract({
      address: USDC,
      abi: USDC_ABI as Abi,
      functionName: 'allowance',
      args: [user, REG],
    })) as bigint;
    return {
      fee,
      allowance,
      okAllowance: allowance >= fee,
    };
  }, [pub, feeUnits]);

  // ---------- Writes ----------
  const ensureUSDCApproval = useCallback(
    async (needed: bigint, opts?: { infinite?: boolean }) => {
      assert();
      await ensureBase();

      const owner = req(address, 'No wallet address');
      const allowance = (await pub!.readContract({
        address: USDC,
        abi: USDC_ABI as Abi,
        functionName: 'allowance',
        args: [owner, REG],
      })) as bigint;

      if (allowance >= needed) return;

      const amount = opts?.infinite ? (2n ** 256n - 1n) : needed;

      const { request } = await pub!.simulateContract({
        address: USDC,
        abi: USDC_ABI as Abi,
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

  const createProfile = useCallback(
    async (params: {
      handle: string;
      displayName?: string;
      avatarURI?: string;
      bio?: string;
      fid?: number;
    }) => {
      assert();
      await ensureBase();

      const handle = params.handle.trim().replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9._-]{3,32}$/.test(handle)) {
        throw new Error('Invalid handle format');
      }
      if (await handleTaken(handle)) throw new Error('Handle already registered');

      const fee = await feeUnits();
      await ensureUSDCApproval(fee, { infinite: true });

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
        chain: pub!.chain,
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
