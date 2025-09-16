// /lib/env.ts
const required = [
  "NEXT_PUBLIC_BASE_CHAIN_ID",
  "NEXT_PUBLIC_USDC",
  "NEXT_PUBLIC_PROFILE_REGISTRY",
  "NEXT_PUBLIC_CREATOR_HUB",
  "NEXT_PUBLIC_RATINGS",
] as const

export function assertEnv() {
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    throw new Error(`Missing env var(s): ${missing.join(", ")}`)
  }
}
