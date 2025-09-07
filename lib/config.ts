// lib/config.ts
export const SITE =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000';

export const BASE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? 8453);

export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

export const CREATOR_HUB_ADDR = '0x49b9a469d8867e29a4e6810aed4dad724317f606' as `0x${string}`;
