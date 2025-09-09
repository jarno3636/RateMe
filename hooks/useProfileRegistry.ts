// hooks/useProfileRegistry.ts
'use client';
import { useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import type { Address, Abi } from 'viem';
import { PROFILE_REGISTRY_ABI, PROFILE_REGISTRY_ADDR, BASE_USDC, USDC_ABI } from '@/lib/registry';

const REG = PROFILE_REGISTRY_ADDR as Address;

export function useProfileRegistry() {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();

  const assert = () => {
    if (!pub) throw new Error('Public client unavailable');
    if (!wallet?.account) throw new Error('Connect wallet');
  };

  const feeUnits = useCallback(async (): Promise<bigint> => {
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'feeUnits',
      args: [],
    })) as bigint;
  }, [pub]);

  const handleTaken = useCallback(async (handle: string): Promise<boolean> => {
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'handleTaken',
      args: [handle],
    })) as boolean;
  }, [pub]);

  const getIdByHandle = useCallback(async (handle: string): Promise<bigint> => {
    return (await pub!.readContract({
      address: REG,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getIdByHandle',
      args: [handle],
    })) as bigint;
  }, [pub]);

  const ensureUSDCApproval = useCallback(
    async (needed: bigint) => {
      assert();
      const owner = address!;
      const allowance = (await pub!.readContract({
        address: BASE_USDC,
        abi: USDC_ABI as Abi,
        functionName: 'allowance',
        args: [owner, REG],
      })) as bigint;

      if (allowance >= needed) return;

      const { request } = await pub!.simulateContract({
        address: BASE_USDC,
        abi: USDC_ABI as Abi,
        functionName: 'approve',
        args: [REG, needed],
        account: wallet!.account,
      });
      const hash = await wallet!.writeContract(request);
      await pub!.waitForTransactionReceipt({ hash });
    },
    [address, pub, wallet]
  );

  const createProfile = useCallback(
    async (params: { handle: string; displayName?: string; avatarURI?: string; bio?: string; fid?: number }) => {
      assert();

      const handle = params.handle.toLowerCase().replace(/^@/, '');
      if (await handleTaken(handle)) throw new Error('Handle already registered');

      const fee = await feeUnits();
      await ensureUSDCApproval(fee);

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

      // get the on-chain id (cheap single read)
      const id = await getIdByHandle(handle);

      return { txHash, id }; // id is bigint
    },
    [pub, wallet, ensureUSDCApproval, feeUnits, handleTaken, getIdByHandle]
  );

  return { feeUnits, handleTaken, getIdByHandle, createProfile };
}
