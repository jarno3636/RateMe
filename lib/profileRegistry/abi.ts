// lib/profileRegistry/abi.ts
import type { Abi } from 'viem'

/**
 * ABI covers every function your app is calling anywhere:
 * - handleTaken(string) -> bool
 * - feeUnits() -> uint256
 * - getIdByHandle(string) -> uint256     // some versions expose this
 * - getProfile(uint256) -> tuple(...)
 * - getProfileByHandle(string) -> tuple(...)
 * - getProfilesByOwner(address) -> uint256[]
 * - createProfile(string, string, string, string, uint256) -> uint256
 *
 * If your deployed contract differs, adjust the tuple ordering here
 * to match your actual implementation.
 */
export const PROFILE_REGISTRY_ABI = [
  // --- views ---
  {
    type: 'function',
    name: 'handleTaken',
    stateMutability: 'view',
    inputs: [{ name: 'handle', type: 'string' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'feeUnits',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    // optional on some versions; safe to call in try/catch
    type: 'function',
    name: 'getIdByHandle',
    stateMutability: 'view',
    inputs: [{ name: 'handle', type: 'string' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getProfilesByOwner',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getProfile',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },    // r[0]
      { name: 'handle', type: 'string' },    // r[1]
      { name: 'displayName', type: 'string' }, // r[2]
      { name: 'avatarURI', type: 'string' }, // r[3]
      { name: 'bio', type: 'string' },       // r[4]
      { name: 'fid', type: 'uint256' },      // r[5]
      { name: 'createdAt', type: 'uint256' } // r[6] (secs)
    ],
  },
  {
    type: 'function',
    name: 'getProfileByHandle',
    stateMutability: 'view',
    inputs: [{ name: 'handle', type: 'string' }],
    outputs: [
      // keep order compatible with your reads
      { name: 'exists', type: 'bool' },      // r[0] (some impls return a flag first)
      { name: 'id', type: 'uint256' },       // r[1] (if exists==true; otherwise 0)
      { name: 'owner', type: 'address' },    // r[2] or r[3] depending on impl
      { name: 'maybeOwner2', type: 'address' },
      { name: 'displayName', type: 'string' },
      { name: 'avatarURI', type: 'string' },
      { name: 'bio', type: 'string' },
      { name: 'fid', type: 'uint256' },
      { name: 'createdAt', type: 'uint256' },
    ],
  },

  // --- writes ---
  {
    type: 'function',
    name: 'createProfile',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'handle', type: 'string' },
      { name: 'displayName', type: 'string' },
      { name: 'avatarURI', type: 'string' },
      { name: 'bio', type: 'string' },
      { name: 'fid', type: 'uint256' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
] as const satisfies Abi
