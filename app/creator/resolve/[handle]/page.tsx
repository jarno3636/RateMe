// app/creator/resolve/[handle]/page.tsx
import { redirect } from 'next/navigation';
import { readIdByHandle } from '@/lib/profileRegistry/reads';
import { normalizeHandle, isValidHandle } from '@/lib/handles';
import { getCreatorByHandle } from '@/lib/kv';

type Props = { params: { handle: string } };

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function ResolveHandlePage({ params }: Props) {
  const incoming = String(params.handle || '');
  const handle = normalizeHandle(incoming); // trims, removes leading @, lowercases

  // Basic validation: skip pointless work if handle format is wrong
  if (!handle || !isValidHandle(handle)) {
    redirect(`/creator?invalid=${encodeURIComponent(incoming)}`);
  }

  // 1) Fast path: if KV already knows this handle, go straight there
  try {
    const kv = await getCreatorByHandle(handle);
    if (kv?.id) {
      // Canonical route accepts either handle or numeric id; we prefer handle here
      redirect(`/creator/${encodeURIComponent(kv.handle || kv.id)}`);
    }
  } catch {
    // ignore and fall through to chain
  }

  // 2) On-chain resolution (some registries return 0n if not found)
  try {
    const id = await readIdByHandle(handle);
    if (id && id !== 0n) {
      // Numeric id route lets the page do an on-chain fallback if KV is empty
      redirect(`/creator/${id.toString()}`);
    } else {
      // Not found on-chain → send them to the creator flow with prefilled handle
      redirect(`/creator?prefill=${encodeURIComponent(handle)}`);
    }
  } catch {
    // RPC hiccup or contract reverted → soft-landing to creator flow with prefill
    redirect(`/creator?prefill=${encodeURIComponent(handle)}`);
  }
}
