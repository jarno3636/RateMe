// lib/profileRegistry/abi.ts
import type { Abi } from 'viem';

export const PROFILE_REGISTRY_ABI = [
  // constructor
  { type: 'constructor', inputs: [
    { internalType: 'address', name: '_usdc', type: 'address' },
    { internalType: 'address', name: '_treasury', type: 'address' },
  ], stateMutability: 'nonpayable' },

  // views
  { type: 'function', stateMutability: 'view', name: 'USDC', inputs: [], outputs: [{ internalType:'contract IERC20', name:'', type:'address' }] },
  { type: 'function', stateMutability: 'view', name: 'VERSION', inputs: [], outputs: [{ internalType:'string', name:'', type:'string' }] },
  { type: 'function', stateMutability: 'view', name: 'allHandles', inputs: [], outputs: [{ internalType:'string[]', name:'handles_', type:'string[]' }] },
  { type: 'function', stateMutability: 'view', name: 'allIds', inputs: [], outputs: [{ internalType:'uint256[]', name:'ids', type:'uint256[]' }] },
  { type: 'function', stateMutability: 'view', name: 'canRegister', inputs: [{ internalType:'string', name:'handle', type:'string' }], outputs: [
    { internalType:'bool', name:'ok', type:'bool' },
    { internalType:'string', name:'reason', type:'string' },
  ]},
  { type: 'function', stateMutability: 'view', name: 'feeInfo', inputs: [], outputs: [
    { internalType:'address', name:'_treasury', type:'address' },
    { internalType:'uint256', name:'_feeUnits', type:'uint256' },
  ]},
  { type: 'function', stateMutability: 'view', name: 'feeUnits', inputs: [], outputs: [{ internalType:'uint256', name:'', type:'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'getHandle', inputs: [{ internalType:'uint256', name:'id', type:'uint256' }], outputs: [{ internalType:'string', name:'', type:'string' }] },
  { type: 'function', stateMutability: 'view', name: 'getIdByHandle', inputs: [{ internalType:'string', name:'handle', type:'string' }], outputs: [{ internalType:'uint256', name:'', type:'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'getOwnerOf', inputs: [{ internalType:'uint256', name:'id', type:'uint256' }], outputs: [{ internalType:'address', name:'', type:'address' }] },
  { type: 'function', stateMutability: 'view', name: 'getProfile', inputs: [{ internalType:'uint256', name:'id', type:'uint256' }], outputs: [
    { internalType:'address', name:'owner_', type:'address' },
    { internalType:'string', name:'handle_', type:'string' },
    { internalType:'string', name:'displayName_', type:'string' },
    { internalType:'string', name:'avatarURI_', type:'string' },
    { internalType:'string', name:'bio_', type:'string' },
    { internalType:'uint256', name:'fid_', type:'uint256' },
    { internalType:'uint64', name:'createdAt_', type:'uint64' },
  ]},
  { type: 'function', stateMutability: 'view', name: 'getProfileByHandle', inputs: [{ internalType:'string', name:'handle', type:'string' }], outputs: [
    { internalType:'bool', name:'exists', type:'bool' },
    { internalType:'uint256', name:'id', type:'uint256' },
    { internalType:'address', name:'owner_', type:'address' },
    { internalType:'string', name:'handle_', type:'string' },
    { internalType:'string', name:'displayName_', type:'string' },
    { internalType:'string', name:'avatarURI_', type:'string' },
    { internalType:'string', name:'bio_', type:'string' },
    { internalType:'uint256', name:'fid_', type:'uint256' },
    { internalType:'uint64', name:'createdAt_', type:'uint64' },
  ]},
  { type: 'function', stateMutability: 'view', name: 'getProfilesByOwner', inputs: [{ internalType:'address', name:'who', type:'address' }], outputs: [{ internalType:'uint256[]', name:'', type:'uint256[]' }] },
  { type: 'function', stateMutability: 'view', name: 'getProfilesFlat', inputs: [{ internalType:'uint256[]', name:'ids', type:'uint256[]' }], outputs: [
    { internalType:'uint256[]', name:'outIds', type:'uint256[]' },
    { internalType:'address[]', name:'owners', type:'address[]' },
    { internalType:'string[]', name:'handles', type:'string[]' },
    { internalType:'string[]', name:'displayNames', type:'string[]' },
    { internalType:'string[]', name:'avatarURIs', type:'string[]' },
    { internalType:'string[]', name:'bios', type:'string[]' },
    { internalType:'uint256[]', name:'fids', type:'uint256[]' },
    { internalType:'uint64[]', name:'createdAts', type:'uint64[]' },
  ]},
  { type: 'function', stateMutability: 'view', name: 'handleTaken', inputs: [{ internalType:'string', name:'handle', type:'string' }], outputs: [{ internalType:'bool', name:'', type:'bool' }] },
  { type: 'function', stateMutability: 'view', name: 'isProfileOwner', inputs: [
    { internalType:'address', name:'who', type:'address' },
    { internalType:'uint256', name:'id', type:'uint256' },
  ], outputs: [{ internalType:'bool', name:'', type:'bool' }] },
  { type: 'function', stateMutability: 'view', name: 'listProfilesFlat', inputs: [
    { internalType:'uint256', name:'cursor', type:'uint256' },
    { internalType:'uint256', name:'size', type:'uint256' },
  ], outputs: [
    { internalType:'uint256[]', name:'outIds', type:'uint256[]' },
    { internalType:'address[]', name:'owners', type:'address[]' },
    { internalType:'string[]', name:'handles', type:'string[]' },
    { internalType:'string[]', name:'displayNames', type:'string[]' },
    { internalType:'string[]', name:'avatarURIs', type:'string[]' },
    { internalType:'string[]', name:'bios', type:'string[]' },
    { internalType:'uint256[]', name:'fids', type:'uint256[]' },
    { internalType:'uint64[]', name:'createdAts', type:'uint64[]' },
    { internalType:'uint256', name:'nextCursor', type:'uint256' },
  ]},
  { type: 'function', stateMutability: 'view', name: 'nextId', inputs: [], outputs: [{ internalType:'uint256', name:'', type:'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'owner', inputs: [], outputs: [{ internalType:'address', name:'', type:'address' }] },
  { type: 'function', stateMutability: 'view', name: 'previewCreate', inputs: [{ internalType:'address', name:'user', type:'address' }], outputs: [
    { internalType:'uint256', name:'balance', type:'uint256' },
    { internalType:'uint256', name:'allowance_', type:'uint256' },
    { internalType:'uint256', name:'fee', type:'uint256' },
    { internalType:'bool', name:'okBalance', type:'bool' },
    { internalType:'bool', name:'okAllowance', type:'bool' },
  ]},
  { type: 'function', stateMutability: 'view', name: 'profileCount', inputs: [], outputs: [{ internalType:'uint256', name:'', type:'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'treasury', inputs: [], outputs: [{ internalType:'address', name:'', type:'address' }] },
  { type: 'function', stateMutability: 'view', name: 'usdcToken', inputs: [], outputs: [{ internalType:'address', name:'', type:'address' }] },

  // writes used in UI (optional but supported by your ABI)
  { type: 'function', stateMutability: 'nonpayable', name: 'createProfile', inputs: [
    { internalType:'string', name:'handle', type:'string' },
    { internalType:'string', name:'displayName', type:'string' },
    { internalType:'string', name:'avatarURI', type:'string' },
    { internalType:'string', name:'bio', type:'string' },
    { internalType:'uint256', name:'fid', type:'uint256' },
  ], outputs: [{ internalType:'uint256', name:'id', type:'uint256' }] },
  { type: 'function', stateMutability: 'nonpayable', name: 'updateProfile', inputs: [
    { internalType:'uint256', name:'id', type:'uint256' },
    { internalType:'string', name:'displayName', type:'string' },
    { internalType:'string', name:'avatarURI', type:'string' },
    { internalType:'string', name:'bio', type:'string' },
    { internalType:'uint256', name:'fid', type:'uint256' },
  ], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'changeHandle', inputs: [
    { internalType:'uint256', name:'id', type:'uint256' },
    { internalType:'string', name:'newHandle', type:'string' },
  ], outputs: [] },
] as const satisfies Abi;
