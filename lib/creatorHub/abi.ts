// lib/creatorHub/abi.ts
import type { Abi } from 'viem';

export const CREATOR_HUB_ABI = [
  // (trimmed to the functions we use)
  { type: 'function', stateMutability: 'view', name: 'getCreatorPlanIds', inputs: [{ internalType:'address', name:'creator', type:'address' }], outputs: [{ internalType:'uint256[]', name:'', type:'uint256[]' }] },
  { type: 'function', stateMutability: 'view', name: 'getCreatorPostIds', inputs: [{ internalType:'address', name:'creator', type:'address' }], outputs: [{ internalType:'uint256[]', name:'', type:'uint256[]' }] },
  { type: 'function', stateMutability: 'view', name: 'hasPostAccess', inputs: [
    { internalType:'address', name:'user', type:'address' },
    { internalType:'uint256', name:'postId', type:'uint256' },
  ], outputs: [{ internalType:'bool', name:'', type:'bool' }] },
  { type: 'function', stateMutability: 'view', name: 'isActive', inputs: [
    { internalType:'address', name:'user', type:'address' },
    { internalType:'address', name:'creator', type:'address' },
  ], outputs: [{ internalType:'bool', name:'', type:'bool' }] },
  { type: 'function', stateMutability: 'view', name: 'plans', inputs: [{ internalType:'uint256', name:'', type:'uint256' }], outputs: [
    { internalType:'address', name:'creator', type:'address' },
    { internalType:'address', name:'token', type:'address' },
    { internalType:'uint128', name:'pricePerPeriod', type:'uint128' },
    { internalType:'uint32', name:'periodDays', type:'uint32' },
    { internalType:'bool', name:'active', type:'bool' },
    { internalType:'string', name:'name', type:'string' },
    { internalType:'string', name:'metadataURI', type:'string' },
  ]},
  { type: 'function', stateMutability: 'view', name: 'posts', inputs: [{ internalType:'uint256', name:'', type:'uint256' }], outputs: [
    { internalType:'address', name:'creator', type:'address' },
    { internalType:'address', name:'token', type:'address' },
    { internalType:'uint128', name:'price', type:'uint128' },
    { internalType:'bool', name:'active', type:'bool' },
    { internalType:'bool', name:'accessViaSub', type:'bool' },
    { internalType:'string', name:'uri', type:'string' },
  ]},
  { type: 'function', stateMutability: 'nonpayable', name: 'createPlan', inputs: [
    { internalType:'address', name:'token', type:'address' },
    { internalType:'uint128', name:'pricePerPeriod', type:'uint128' },
    { internalType:'uint32', name:'periodDays', type:'uint32' },
    { internalType:'string', name:'name', type:'string' },
    { internalType:'string', name:'metadataURI', type:'string' },
  ], outputs: [{ internalType:'uint256', name:'id', type:'uint256' }] },
  { type: 'function', stateMutability: 'nonpayable', name: 'createPost', inputs: [
    { internalType:'address', name:'token', type:'address' },
    { internalType:'uint128', name:'price', type:'uint128' },
    { internalType:'bool', name:'accessViaSub', type:'bool' },
    { internalType:'string', name:'uri', type:'string' },
  ], outputs: [{ internalType:'uint256', name:'id', type:'uint256' }] },
  { type: 'function', stateMutability: 'payable', name: 'subscribe', inputs: [
    { internalType:'uint256', name:'id', type:'uint256' },
    { internalType:'uint32', name:'periods', type:'uint32' },
  ], outputs: [] },
  { type: 'function', stateMutability: 'payable', name: 'buyPost', inputs: [{ internalType:'uint256', name:'id', type:'uint256' }], outputs: [] },
] as const satisfies Abi;
