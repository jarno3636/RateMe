// lib/creatorHub.ts
import type { Abi } from 'viem'

/** ✅ Set this in your Vercel env: NEXT_PUBLIC_CREATOR_HUB_ADDR */
export const CREATOR_HUB_ADDR =
  (process.env.NEXT_PUBLIC_CREATOR_HUB_ADDR as `0x${string}`) ||
  // 👇 fallback (dev only). replace with your real Base address or remove.
  '0x0000000000000000000000000000000000000000'

export const CREATOR_HUB_ABI = [
  // (trimmed to the functions we call)
  {
    "type":"function","stateMutability":"view","name":"plans",
    "inputs":[{"name":"","type":"uint256"}],
    "outputs":[
      {"name":"creator","type":"address"},
      {"name":"token","type":"address"},
      {"name":"pricePerPeriod","type":"uint128"},
      {"name":"periodDays","type":"uint32"},
      {"name":"active","type":"bool"},
      {"name":"name","type":"string"},
      {"name":"metadataURI","type":"string"}
    ]
  },
  {
    "type":"function","stateMutability":"view","name":"posts",
    "inputs":[{"name":"","type":"uint256"}],
    "outputs":[
      {"name":"creator","type":"address"},
      {"name":"token","type":"address"},
      {"name":"price","type":"uint128"},
      {"name":"active","type":"bool"},
      {"name":"accessViaSub","type":"bool"},
      {"name":"uri","type":"string"}
    ]
  },
  {
    "type":"function","stateMutability":"nonpayable","name":"createPlan",
    "inputs":[
      {"name":"token","type":"address"},
      {"name":"pricePerPeriod","type":"uint128"},
      {"name":"periodDays","type":"uint32"},
      {"name":"name","type":"string"},
      {"name":"metadataURI","type":"string"}
    ],
    "outputs":[{"name":"id","type":"uint256"}]
  },
  {
    "type":"function","stateMutability":"nonpayable","name":"createPost",
    "inputs":[
      {"name":"token","type":"address"},
      {"name":"price","type":"uint128"},
      {"name":"accessViaSub","type":"bool"},
      {"name":"uri","type":"string"}
    ],
    "outputs":[{"name":"id","type":"uint256"}]
  },
  {
    "type":"function","stateMutability":"payable","name":"subscribe",
    "inputs":[{"name":"id","type":"uint256"},{"name":"periods","type":"uint32"}],
    "outputs":[]
  },
  {
    "type":"function","stateMutability":"payable","name":"buyPost",
    "inputs":[{"name":"id","type":"uint256"}],
    "outputs":[]
  }
] as const satisfies Abi
