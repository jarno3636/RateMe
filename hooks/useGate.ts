// hooks/useGate.ts
'use client'

import { useCallback, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { toChecksum, verifyPostAccess, verifySubActive } from '@/lib/gate'

export function useGate() {
  const { address } = useAccount()
  const user = useMemo(() => (address ? toChecksum(address) : null), [address])
  const [loading, setLoading] = useState(false)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkPost = useCallback(async (postId: bigint) => {
    if (!user) { setError('Connect wallet'); setAllowed(false); return false }
    try {
      setLoading(true); setError(null)
      const ok = await verifyPostAccess(user, postId)
      setAllowed(ok)
      return ok
    } catch (e: any) {
      setError(e?.message || 'Failed'); setAllowed(false)
      return false
    } finally { setLoading(false) }
  }, [user])

  const checkSub = useCallback(async (creator: `0x${string}`) => {
    if (!user) { setError('Connect wallet'); setAllowed(false); return false }
    try {
      setLoading(true); setError(null)
      const ok = await verifySubActive(user, creator)
      setAllowed(ok)
      return ok
    } catch (e: any) {
      setError(e?.message || 'Failed'); setAllowed(false)
      return false
    } finally { setLoading(false) }
  }, [user])

  return { user, loading, allowed, error, checkPost, checkSub }
}
