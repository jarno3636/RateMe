// lib/profileRegistry/contract.ts
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { PROFILE_REGISTRY_ABI } from "./abi";
import { REGISTRY_ADDRESS } from "./constants";

export function getRegistryContract(readOrWrite: any) {
  // readOrWrite can be: window.ethereum signer, a Wallet, or a Provider
  return new Contract(REGISTRY_ADDRESS, PROFILE_REGISTRY_ABI, readOrWrite);
}

// Optional: simple default read provider (Base public RPC or your node)
export function getReadProvider() {
  return new JsonRpcProvider("https://mainnet.base.org"); // use your infra if you have one
}
