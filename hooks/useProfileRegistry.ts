"use client"
import { useReadContract } from "wagmi"
import ProfileRegistry from "@/abi/ProfileRegistry.json"

const REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`

export function useListProfiles(cursor: bigint = 0n, size: bigint = 12n) {
  return useReadContract({
    abi: ProfileRegistry as any,
    address: REGISTRY,
    functionName: "listProfilesFlat",
    args: [cursor, size],
  })
}
