// lib/neynar.ts
import { NEYNAR_API_KEY } from './config';

export type NeynarUser = {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  bio?: { text?: string };
};

export async function fetchNeynarUserByHandle(handle: string): Promise<NeynarUser | null> {
  if (!NEYNAR_API_KEY) return null;
  const url = `https://api.neynar.com/v2/farcaster/user-by-username?username=${encodeURIComponent(handle)}`;
  const res = await fetch(url, { headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY } });
  if (!res.ok) return null;
  const data = await res.json();
  const u = data?.result?.user;
  if (!u) return null;
  return {
    fid: u.fid,
    username: u.username,
    display_name: u.display_name,
    pfp_url: u.pfp_url,
    bio: { text: u.profile?.bio?.text }
  };
}
