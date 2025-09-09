// lib/profileRegistry/reads.ts
export {
  registryClient as readClient,
  readFeeUnits,
  readHandleTaken,
  readIdByHandle,
  getReadProvider,       // shim for legacy imports
  getRegistryContract,   // shim for legacy imports
} from './contract';
