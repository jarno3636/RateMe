// lib/profileRegistry/constants.ts
import type { Address } from 'viem';
import { isAddress } from 'viem';
import { base } from 'viem/chains';

export const BASE = base;
export const BASE_CHAIN_ID = base.id; // 8453

// Env
const RAW_PROFILE_REG = (process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ADDR || '').trim();
const RAW_HUB = (process.env.NEXT_PUBLIC_CREATOR_HUB_ADDR || '').trim();

// Valid address helper
function asAddr(a?: string): Address | undefined {
  return a && isAddress(a as Address) && !/^0x0{40}$/i.test(a.slice(2))
    ? (a as Address)
    : undefined;
}

// Public constants
export const REGISTRY_ADDRESS = asAddr(RAW_PROFILE_REG);
export const CREATOR_HUB_ADDRESS = asAddr(RAW_HUB);

export const registryConfigured = !!REGISTRY_ADDRESS;
export const hubConfigured = !!CREATOR_HUB_ADDRESS;

// Canonical Base USDC (6 decimals)
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;

// Zero helpers
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
export const isZeroAddress = (a?: string | null) => !a || /^0x0{40}$/i.test(String(a).slice(2));
