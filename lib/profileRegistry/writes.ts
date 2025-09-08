// lib/profileRegistry/writes.ts
import { Contract } from "ethers";
import { PROFILE_REGISTRY_ABI } from "./abi";
import { REGISTRY_ADDRESS, USDC_ADDRESS } from "./constants";

// minimal ERC20 approve ABI
const ERC20_ABI = [
  { "inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],
    "name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],
    "name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"address","name":"account","type":"address"}],
    "name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" }
];

export function getRegistryWithSigner(signer: any) {
  return new Contract(REGISTRY_ADDRESS, PROFILE_REGISTRY_ABI, signer);
}
export function getUsdcWithSigner(signer: any) {
  return new Contract(USDC_ADDRESS, ERC20_ABI, signer);
}

export async function ensureAllowanceForFee(signer: any) {
  const reg = getRegistryWithSigner(signer);
  const usdc = getUsdcWithSigner(signer);
  const user = await signer.getAddress();
  const [ , fee ] = await reg.feeInfo();
  const current = await usdc.allowance(user, REGISTRY_ADDRESS);
  if (current < fee) {
    const tx = await usdc.approve(REGISTRY_ADDRESS, fee);
    await tx.wait();
  }
}

export async function createProfile(signer: any, params: {
  handle: string,
  displayName: string,
  avatarURI: string,
  bio: string,
  fid: bigint
}) {
  await ensureAllowanceForFee(signer);
  const reg = getRegistryWithSigner(signer);
  const tx = await reg.createProfile(
    params.handle.toLowerCase(),
    params.displayName,
    params.avatarURI,
    params.bio,
    params.fid
  );
  const rc = await tx.wait();
  // Find the emitted id if you like (optional):
  // const ev = rc.logs?.find(l => l.fragment?.name === "ProfileCreated");
  // const id = ev ? ev.args?.id as bigint : undefined;
  return rc;
}

export async function updateProfile(signer: any, id: bigint, p: {
  displayName: string, avatarURI: string, bio: string, fid: bigint
}) {
  const reg = getRegistryWithSigner(signer);
  const tx = await reg.updateProfile(id, p.displayName, p.avatarURI, p.bio, p.fid);
  return tx.wait();
}

export async function changeHandle(signer: any, id: bigint, newHandle: string) {
  const reg = getRegistryWithSigner(signer);
  const tx = await reg.changeHandle(id, newHandle.toLowerCase());
  return tx.wait();
}

export async function transferProfile(signer: any, id: bigint, to: string) {
  const reg = getRegistryWithSigner(signer);
  const tx = await reg.transferProfile(id, to);
  return tx.wait();
}
