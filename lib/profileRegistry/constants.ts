// lib/profileRegistry/constants.ts
import { base as BASE } from 'viem/chains';
import type { Abi } from 'viem';

/** ---------- chain / addresses ---------- */
export const BASE_CHAIN_ID = BASE.id; // 8453
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * USDC on Base mainnet (override with NEXT_PUBLIC_USDC_ADDRESS if needed).
 */
export const USDC_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) ??
  ('0x833589fCD6EDb6E08f4c7C32D4f71b54bDA02913' as `0x${string}`);

/**
 * Profile Registry address (must be set for writes).
 * Uses NEXT_PUBLIC_PROFILE_REGISTRY_ADDR.
 */
export const PROFILE_REGISTRY_ADDR: `0x${string}` =
  ((process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ADDR || '').trim() || ZERO_ADDRESS) as `0x${string}`;

export const registryConfigured = PROFILE_REGISTRY_ADDR !== ZERO_ADDRESS;

/**
 * Some legacy code imports these names — keep aliases to avoid refactors.
 */
export const REGISTRY_ADDRESS = PROFILE_REGISTRY_ADDR; // legacy alias

/**
 * Some places import Creator Hub details from here (historical). Re-export
 * with sensible defaults so those imports don’t break.
 */
export const CREATOR_HUB_ADDRESS: `0x${string}` =
  ((process.env.NEXT_PUBLIC_CREATOR_HUB_ADDR || '').trim() || ZERO_ADDRESS) as `0x${string}`;
export const hubConfigured = CREATOR_HUB_ADDRESS !== ZERO_ADDRESS;

/** ---------- ABI (your ProfileRegistry ABI) ---------- */
export const PROFILE_REGISTRY_ABI = [
  {"inputs":[{"internalType":"address","name":"_usdc","type":"address"},{"internalType":"address","name":"_treasury","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"feeUnits","type":"uint256"}],"name":"FeeUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"string","name":"oldHandle","type":"string"},{"indexed":false,"internalType":"string","name":"newHandle","type":"string"}],"name":"HandleChanged","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"string","name":"handle","type":"string"},{"indexed":false,"internalType":"uint256","name":"fee","type":"uint256"}],"name":"ProfileCreated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"ProfileUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"treasury","type":"address"}],"name":"TreasuryUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdrawn","type":"event"},
  {"inputs":[],"name":"USDC","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"VERSION","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"allHandles","outputs":[{"internalType":"string[]","name":"handles_","type":"string[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"allIds","outputs":[{"internalType":"uint256[]","name":"ids","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"handle","type":"string"}],"name":"canRegister","outputs":[{"internalType":"bool","name":"ok","type":"bool"},{"internalType":"string","name":"reason","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"newHandle","type":"string"}],"name":"changeHandle","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"string","name":"handle","type":"string"},{"internalType":"string","name":"displayName","type":"string"},{"internalType":"string","name":"avatarURI","type":"string"},{"internalType":"string","name":"bio","type":"string"},{"internalType":"uint256","name":"fid","type":"uint256"}],"name":"createProfile","outputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"feeInfo","outputs":[{"internalType":"address","name":"_treasury","type":"address"},{"internalType":"uint256","name":"_feeUnits","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"feeUnits","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getHandle","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"handle","type":"string"}],"name":"getIdByHandle","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getOwnerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getProfile","outputs":[{"internalType":"address","name":"owner_","type":"address"},{"internalType":"string","name":"handle_","type":"string"},{"internalType":"string","name":"displayName_","type":"string"},{"internalType":"string","name":"avatarURI_","type":"string"},{"internalType":"string","name":"bio_","type":"string"},{"internalType":"uint256","name":"fid_","type":"uint256"},{"internalType":"uint64","name":"createdAt_","type":"uint64"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"handle","type":"string"}],"name":"getProfileByHandle","outputs":[{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"owner_","type":"address"},{"internalType":"string","name":"handle_","type":"string"},{"internalType":"string","name":"displayName_","type":"string"},{"internalType":"string","name":"avatarURI_","type":"string"},{"internalType":"string","name":"bio_","type":"string"},{"internalType":"uint256","name":"fid_","type":"uint256"},{"internalType":"uint64","name":"createdAt_","type":"uint64"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"who","type":"address"}],"name":"getProfilesByOwner","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256[]","name":"ids","type":"uint256[]"}],"name":"getProfilesFlat","outputs":[{"internalType":"uint256[]","name":"outIds","type":"uint256[]"},{"internalType":"address[]","name":"owners","type":"address[]"},{"internalType":"string[]","name":"handles","type":"string[]"},{"internalType":"string[]","name":"displayNames","type":"string[]"},{"internalType":"string[]","name":"avatarURIs","type":"string[]"},{"internalType":"string[]","name":"bios","type":"string[]"},{"internalType":"uint256[]","name":"fids","type":"uint256[]"},{"internalType":"uint64[]","name":"createdAts","type":"uint64[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"handle","type":"string"}],"name":"handleTaken","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"who","type":"address"},{"internalType":"uint256","name":"id","type":"uint256"}],"name":"isProfileOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"cursor","type":"uint256"},{"internalType":"uint256","name":"size","type":"uint256"}],"name":"listProfilesFlat","outputs":[{"internalType":"uint256[]","name":"outIds","type":"uint256[]"},{"internalType":"address[]","name":"owners","type":"address[]"},{"internalType":"string[]","name":"handles","type":"string[]"},{"internalType":"string[]","name":"displayNames","type":"string[]"},{"internalType":"string[]","name":"avatarURIs","type":"string[]"},{"internalType":"string[]","name":"bios","type":"string[]"},{"internalType":"uint256[]","name":"fids","type":"uint256[]"},{"internalType":"uint64[]","name":"createdAts","type":"uint64[]"},{"internalType":"uint256","name":"nextCursor","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"nextId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"previewCreate","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"allowance_","type":"uint256"},{"internalType":"uint256","name":"fee","type":"uint256"},{"internalType":"bool","name":"okBalance","type":"bool"},{"internalType":"bool","name":"okAllowance","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"profileCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"newFeeUnits","type":"uint256"}],"name":"setFeeUnits","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"t","type":"address"}],"name":"setTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"displayName","type":"string"},{"internalType":"string","name":"avatarURI","type":"string"},{"internalType":"string","name":"bio","type":"string"},{"internalType":"uint256","name":"fid","type":"uint256"}],"name":"updateProfile","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdrawToken","outputs":[],"stateMutability":"nonpayable","type":"function"}
] as const satisfies Abi;
