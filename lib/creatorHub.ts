// lib/creatorHub.ts
import type { Address } from 'viem';

export const CREATOR_HUB: Address = '0x49b9a469d8867e29a4e6810aed4dad724317f606'; // Base

export const CREATOR_HUB_ABI = [
  { "type":"function","stateMutability":"view","name":"feeBps","inputs":[],"outputs":[{"type":"uint96"}] },
  { "type":"function","stateMutability":"view","name":"feeRecipient","inputs":[],"outputs":[{"type":"address"}] },
  { "type":"function","stateMutability":"view","name":"paused","inputs":[],"outputs":[{"type":"bool"}] },

  { "type":"function","stateMutability":"view","name":"plans","inputs":[{"type":"uint256"}],"outputs":[
    {"type":"address","name":"creator"},
    {"type":"address","name":"token"},
    {"type":"uint128","name":"pricePerPeriod"},
    {"type":"uint32","name":"periodDays"},
    {"type":"bool","name":"active"},
    {"type":"string","name":"name"},
    {"type":"string","name":"metadataURI"}
  ]},
  { "type":"function","stateMutability":"view","name":"posts","inputs":[{"type":"uint256"}],"outputs":[
    {"type":"address","name":"creator"},
    {"type":"address","name":"token"},
    {"type":"uint128","name":"price"},
    {"type":"bool","name":"active"},
    {"type":"bool","name":"accessViaSub"},
    {"type":"string","name":"uri"}
  ]},
  { "type":"function","stateMutability":"view","name":"isActive","inputs":[{"type":"address","name":"user"},{"type":"address","name":"creator"}],"outputs":[{"type":"bool"}] },
  { "type":"function","stateMutability":"view","name":"hasPostAccess","inputs":[{"type":"address","name":"user"},{"type":"uint256","name":"postId"}],"outputs":[{"type":"bool"}] },

  { "type":"function","stateMutability":"nonpayable","name":"createPlan","inputs":[
    {"type":"address","name":"token"},
    {"type":"uint128","name":"pricePerPeriod"},
    {"type":"uint32","name":"periodDays"},
    {"type":"string","name":"name"},
    {"type":"string","name":"metadataURI"}
  ],"outputs":[{"type":"uint256","name":"id"}] },
  { "type":"function","stateMutability":"nonpayable","name":"updatePlan","inputs":[
    {"type":"uint256","name":"id"},
    {"type":"string","name":"name"},
    {"type":"string","name":"metadataURI"},
    {"type":"uint128","name":"pricePerPeriod"},
    {"type":"uint32","name":"periodDays"},
    {"type":"bool","name":"active"}
  ],"outputs":[] },

  { "type":"function","stateMutability":"nonpayable","name":"createPost","inputs":[
    {"type":"address","name":"token"},
    {"type":"uint128","name":"price"},
    {"type":"bool","name":"accessViaSub"},
    {"type":"string","name":"uri"}
  ],"outputs":[{"type":"uint256","name":"id"}] },
  { "type":"function","stateMutability":"nonpayable","name":"updatePost","inputs":[
    {"type":"uint256","name":"id"},
    {"type":"address","name":"token"},
    {"type":"uint128","name":"price"},
    {"type":"bool","name":"active"},
    {"type":"bool","name":"accessViaSub"},
    {"type":"string","name":"uri"}
  ],"outputs":[] },

  { "type":"function","stateMutability":"payable","name":"subscribe","inputs":[
    {"type":"uint256","name":"id"},
    {"type":"uint32","name":"periods"}
  ],"outputs":[] },
  { "type":"function","stateMutability":"payable","name":"buyPost","inputs":[
    {"type":"uint256","name":"id"}
  ],"outputs":[] },
] as const;
