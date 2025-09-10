// lib/profileRegistry/abi.ts
import type { Abi } from 'viem';

/**
 * ProfileRegistry ABI
 * - Kept "as const" + "satisfies Abi" so viem gets perfect literals,
 *   and TS stays happy under isolatedModules.
 * - No runtime changes—just nicer types & reuse across app.
 */
export const PROFILE_REGISTRY_ABI = [
  { "inputs":[{"internalType":"address","name":"_usdc","type":"address"},{"internalType":"address","name":"_treasury","type":"address"}],"stateMutability":"nonpayable","type":"constructor" },
  { "anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"feeUnits","type":"uint256"}],"name":"FeeUpdated","type":"event" },
  { "anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"string","name":"oldHandle","type":"string"},{"indexed":false,"internalType":"string","name":"newHandle","type":"string"}],"name":"HandleChanged","type":"event" },
  { "anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event" },
  { "anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"string","name":"handle","type":"string"},{"indexed":false,"internalType":"uint256","name":"fee","type":"uint256"}],"name":"ProfileCreated","type":"event" },
  { "anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"ProfileTransferred","type":"event" },
  { "anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"ProfileUpdated","type":"event" },
  { "anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"treasury","type":"address"}],"name":"TreasuryUpdated","type":"event" },
  { "anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdrawn","type":"event" },

  { "inputs":[],"name":"USDC","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function" },
  { "inputs":[],"name":"VERSION","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function" },
  { "inputs":[],"name":"allHandles","outputs":[{"internalType":"string[]","name":"handles_","type":"string[]"}],"stateMutability":"view","type":"function" },
  { "inputs":[],"name":"allIds","outputs":[{"internalType":"uint256[]","name":"ids","type":"uint256[]"}],"stateMutability":"view","type":"function" },

  { "inputs":[{"internalType":"string","name":"handle","type":"string"}],"name":"canRegister","outputs":[{"internalType":"bool","name":"ok","type":"bool"},{"internalType":"string","name":"reason","type":"string"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"newHandle","type":"string"}],"name":"changeHandle","outputs":[],"stateMutability":"nonpayable","type":"function" },

  { "inputs":[
      {"internalType":"string","name":"handle","type":"string"},
      {"internalType":"string","name":"displayName","type":"string"},
      {"internalType":"string","name":"avatarURI","type":"string"},
      {"internalType":"string","name":"bio","type":"string"},
      {"internalType":"uint256","name":"fid","type":"uint256"}
    ],
    "name":"createProfile",
    "outputs":[{"internalType":"uint256","name":"id","type":"uint256"}],
    "stateMutability":"nonpayable","type":"function"
  },

  { "inputs":[],"name":"feeInfo","outputs":[{"internalType":"address","name":"_treasury","type":"address"},{"internalType":"uint256","name":"_feeUnits","type":"uint256"}],"stateMutability":"view","type":"function" },
  { "inputs":[],"name":"feeUnits","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" },

  { "inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getHandle","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"string","name":"handle","type":"string"}],"name":"getIdByHandle","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getOwnerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function" },

  { "inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],
    "name":"getProfile",
    "outputs":[
      {"internalType":"address","name":"owner_","type":"address"},
      {"internalType":"string","name":"handle_","type":"string"},
      {"internalType":"string","name":"displayName_","type":"string"},
      {"internalType":"string","name":"avatarURI_","type":"string"},
      {"internalType":"string","name":"bio_","type":"string"},
      {"internalType":"uint256","name":"fid_","type":"uint256"},
      {"internalType":"uint64","name":"createdAt_","type":"uint64"}
    ],
    "stateMutability":"view","type":"function"
  },

  { "inputs":[{"internalType":"string","name":"handle","type":"string"}],
    "name":"getProfileByHandle",
    "outputs":[
      {"internalType":"bool","name":"exists","type":"bool"},
      {"internalType":"uint256","name":"id","type":"uint256"},
      {"internalType":"address","name":"owner_","type":"address"},
      {"internalType":"string","name":"handle_","type":"string"},
      {"internalType":"string","name":"displayName_","type":"string"},
      {"internalType":"string","name":"avatarURI_","type":"string"},
      {"internalType":"string","name":"bio_","type":"string"},
      {"internalType":"uint256","name":"fid_","type":"uint256"},
      {"internalType":"uint64","name":"createdAt_","type":"uint64"}
    ],
    "stateMutability":"view","type":"function"
  },

  { "inputs":[{"internalType":"address","name":"who","type":"address"}],"name":"getProfilesByOwner","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function" },

  { "inputs":[{"internalType":"uint256[]","name":"ids","type":"uint256[]"}],
    "name":"getProfilesFlat",
    "outputs":[
      {"internalType":"uint256[]","name":"outIds","type":"uint256[]"},
      {"internalType":"address[]","name":"owners","type":"address[]"},
      {"internalType":"string[]","name":"handles","type":"string[]"},
      {"internalType":"string[]","name":"displayNames","type":"string[]"},
      {"internalType":"string[]","name":"avatarURIs","type":"string[]"},
      {"internalType":"string[]","name":"bios","type":"string[]"},
      {"internalType":"uint256[]","name":"fids","type":"uint256[]"},
      {"internalType":"uint64[]","name":"createdAts","type":"uint64[]"}
    ],
    "stateMutability":"view","type":"function"
  },

  { "inputs":[{"internalType":"string","name":"handle","type":"string"}],"name":"handleTaken","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"address","name":"who","type":"address"},{"internalType":"uint256","name":"id","type":"uint256"}],"name":"isProfileOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function" },

  { "inputs":[{"internalType":"uint256","name":"cursor","type":"uint256"},{"internalType":"uint256","name":"size","type":"uint256"}],
    "name":"listProfilesFlat",
    "outputs":[
      {"internalType":"uint256[]","name":"outIds","type":"uint256[]"},
      {"internalType":"address[]","name":"owners","type":"address[]"},
      {"internalType":"string[]","name":"handles","type":"string[]"},
      {"internalType":"string[]","name":"displayNames","type":"string[]"},
      {"internalType":"string[]","name":"avatarURIs","type":"string[]"},
      {"internalType":"string[]","name":"bios","type":"string[]"},
      {"internalType":"uint256[]","name":"fids","type":"uint256[]"},
      {"internalType":"uint64[]","name":"createdAts","type":"uint64[]"},
      {"internalType":"uint256","name":"nextCursor","type":"uint256"}
    ],
    "stateMutability":"view","type":"function"
  },

  { "inputs":[],"name":"nextId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" },
  { "inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function" },

  { "inputs":[{"internalType":"address","name":"user","type":"address"}],
    "name":"previewCreate",
    "outputs":[
      {"internalType":"uint256","name":"balance","type":"uint256"},
      {"internalType":"uint256","name":"allowance_","type":"uint256"},
      {"internalType":"uint256","name":"fee","type":"uint256"},
      {"internalType":"bool","name":"okBalance","type":"bool"},
      {"internalType":"bool","name":"okAllowance","type":"bool"}
    ],
    "stateMutability":"view","type":"function"
  },

  { "inputs":[],"name":"profileCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"uint256","name":"newFeeUnits","type":"uint256"}],"name":"setFeeUnits","outputs":[],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"address","name":"t","type":"address"}],"name":"setTreasury","outputs":[],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"to","type":"address"}],"name":"transferProfile","outputs":[],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[],"name":"treasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function" },
  { "inputs":[
      {"internalType":"uint256","name":"id","type":"uint256"},
      {"internalType":"string","name":"displayName","type":"string"},
      {"internalType":"string","name":"avatarURI","type":"string"},
      {"internalType":"string","name":"bio","type":"string"},
      {"internalType":"uint256","name":"fid","type":"uint256"}
    ],
    "name":"updateProfile","outputs":[],"stateMutability":"nonpayable","type":"function"
  },

  { "inputs":[],"name":"usdcToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdrawToken","outputs":[],"stateMutability":"nonpayable","type":"function" }
] as const satisfies Abi;

/* -------------------------------------------------------------------------- */
/* Optional: strongly-typed result helpers for common reads                   */
/* -------------------------------------------------------------------------- */

export type ProfileTuple = readonly [
  owner_: `0x${string}`,
  handle_: string,
  displayName_: string,
  avatarURI_: string,
  bio_: string,
  fid_: bigint,
  createdAt_: bigint
];

export type ProfileByHandleTuple = readonly [
  exists: boolean,
  id: bigint,
  owner_: `0x${string}`,
  handle_: string,
  displayName_: string,
  avatarURI_: string,
  bio_: string,
  fid_: bigint,
  createdAt_: bigint
];

export type PreviewCreateTuple = readonly [
  balance: bigint,
  allowance_: bigint,
  fee: bigint,
  okBalance: boolean,
  okAllowance: boolean
];

export type FeeInfoTuple = readonly [
  _treasury: `0x${string}`,
  _feeUnits: bigint
];

/**
 * Tiny mappers so components don’t index by number everywhere.
 * (Purely convenience; safe to remove if you prefer tuples.)
 */
export function mapProfile(tuple: ProfileTuple) {
  return {
    owner: tuple[0],
    handle: tuple[1],
    displayName: tuple[2],
    avatarURI: tuple[3],
    bio: tuple[4],
    fid: tuple[5],
    createdAt: tuple[6],
  } as const;
}

export function mapProfileByHandle(tuple: ProfileByHandleTuple) {
  return {
    exists: tuple[0],
    id: tuple[1],
    owner: tuple[2],
    handle: tuple[3],
    displayName: tuple[4],
    avatarURI: tuple[5],
    bio: tuple[6],
    fid: tuple[7],
    createdAt: tuple[8],
  } as const;
}

export function mapPreviewCreate(tuple: PreviewCreateTuple) {
  return {
    balance: tuple[0],
    allowance: tuple[1],
    fee: tuple[2],
    okBalance: tuple[3],
    okAllowance: tuple[4],
  } as const;
}

export function mapFeeInfo(tuple: FeeInfoTuple) {
  return {
    treasury: tuple[0],
    feeUnits: tuple[1],
  } as const;
}
