// app/creator/resolve/[handle]/page.tsx
import { redirect, notFound } from 'next/navigation';
import { readIdByHandle } from '@/lib/profileRegistry/reads';
import { normalizeHandle, isValidHandle } from '@/lib/handles';

type Props = { params: { handle: string } };

export const dynamic = 'force-dynamic'; // always fresh (handles may get registered)

export default async function ResolveHandlePage({ params }: Props) {
  const incoming = params.handle || '';
  const handle = normalizeHandle(incoming);

  // Basic validation to avoid pointless chain calls
  if (!handle || !isValidHandle(handle)) {
    // you can choose notFound() or redirect to onboard with a message
    redirect(`/creator?invalid=${encodeURIComponent(incoming)}`);
  }

  try {
    const id = await readIdByHandle(handle);

    // Some registries return 0 when absent; adjust if your contract reverts instead.
    if (!id || id === 0n) {
      // If not found, send to onboard with a prefilled handle (nice UX)
      redirect(`/creator?prefill=${encodeURIComponent(handle)}`);
    }

    // Success: go to canonical page
    redirect(`/creator/${id.toString()}`);
  } catch {
    // If RPC hiccups or contract call fails, send them to creator flow
    redirect(`/creator?prefill=${encodeURIComponent(handle)}`);
  }
}
