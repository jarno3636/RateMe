import type { Address } from 'viem';
import { isAddress } from 'viem';
import { base } from 'viem/chains';

// Base mainnet
export const BASE = base;

// ProfileRegistry address (set via env). If unset, treated as not configured.
export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ADDR || '').trim() as Address | '';

// Base USDC (canonical) — 6 decimals
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;

// Zero address helper
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export function isZeroAddress(a?: string | null) {
  return !a || /^0x0{40}$/i.test(String(a).slice(2));
}

export const registryConfigured: boolean =
  !!REGISTRY_ADDRESS && isAddress(REGISTRY_ADDRESS as Address) && !isZeroAddress(REGISTRY_ADDRESS);
