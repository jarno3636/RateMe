// lib/gateClient.ts
import { getAddress, isAddress } from 'viem';

export async function checkPostAccess(user: string, postId: string | number) {
  if (!isAddress(user)) throw new Error('bad user');
  const body = {
    mode: 'post',
    user: getAddress(user),
    postId: String(postId), // send as string
  };
  const res = await fetch('/api/gate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'gate failed');
  return j as {
    ok: boolean;
    allowed: boolean;
    auth?: any;
    postId: string;
  };
}

export async function checkSubscription(user: string, creator: string) {
  if (!isAddress(user) || !isAddress(creator)) throw new Error('bad addr');
  const body = {
    mode: 'sub',
    user: getAddress(user),
    creator: getAddress(creator),
  };
  const res = await fetch('/api/gate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'gate failed');
  return j as { ok: boolean; allowed: boolean };
}
