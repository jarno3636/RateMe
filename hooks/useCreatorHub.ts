// hooks/useCreatorHub.ts
import { useCallback } from 'react'
import type { Address, Abi } from 'viem'
import { erc20Abi } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { CREATOR_HUB, CREATOR_HUB_ABI } from '@/lib/creatorHub'

/* ---------------------------------- Types --------------------------------- */

export type Plan = {
  creator: Address
  token: Address
  pricePerPeriod: bigint
  periodDays: number
  active: boolean
  name: string
  metadataURI: string
}

export type Post = {
  creator: Address
  token: Address
  price: bigint
  active: boolean
  accessViaSub: boolean
  uri: string
}

/* --------------------------------- Consts --------------------------------- */

const HUB_ADDR = CREATOR_HUB as Address
const HUB_ABI = CREATOR_HUB_ABI as Abi
const ZERO: Address = '0x0000000000000000000000000000000000000000'

/* --------------------------------- Hook ----------------------------------- */

export function useCreatorHub() {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()

  /* --------------------------- Small safety guards -------------------------- */

  const assertPub = () => {
    if (!pub) throw new Error('Public client unavailable')
    return pub
  }

  const assertWallet = () => {
    if (!wallet || !wallet.account) throw new Error('Connect wallet')
    return wallet
  }

  /** Common simulate → write → wait flow */
  const send = useCallback(
    async <TArgs extends unknown[]>(
      fn: string,
      args: TArgs,
      opts?: { value?: bigint }
    ) => {
      const _pub = assertPub()
      const _wal = assertWallet()
      const { request } = await _pub.simulateContract({
        address: HUB_ADDR,
        abi: HUB_ABI,
        functionName: fn as any,
        args: args as any,
        account: _wal.account,
        value: opts?.value,
      })
      const hash = await _wal.writeContract(request)
      return _pub.waitForTransactionReceipt({ hash })
    },
    [pub, wallet]
  )

  /* --------------------------------- Reads --------------------------------- */

  const readPlan = useCallback(
    async (id: bigint): Promise<Plan> => {
      const _pub = assertPub()
      const p = (await _pub.readContract({
        address: HUB_ADDR,
        abi: HUB_ABI,
        functionName: 'plans',
        args: [id],
      })) as unknown as [
        Address, // creator
        Address, // token
        bigint,  // pricePerPeriod
        bigint,  // periodDays
        boolean, // active
        string,  // name
        string   // metadataURI
      ]

      return {
        creator: p[0],
        token: p[1],
        pricePerPeriod: p[2],
        periodDays: Number(p[3]),
        active: p[4],
        name: p[5],
        metadataURI: p[6],
      }
    },
    [pub]
  )

  const readPost = useCallback(
    async (id: bigint): Promise<Post> => {
      const _pub = assertPub()
      const p = (await _pub.readContract({
        address: HUB_ADDR,
        abi: HUB_ABI,
        functionName: 'posts',
        args: [id],
      })) as unknown as [
        Address, // creator
        Address, // token
        bigint,  // price
        boolean, // active
        boolean, // accessViaSub
        string   // uri
      ]

      return {
        creator: p[0],
        token: p[1],
        price: p[2],
        active: p[3],
        accessViaSub: p[4],
        uri: p[5],
      }
    },
    [pub]
  )

  /** Check if a user has post access (paid or via active sub) */
  const hasPostAccess = useCallback(
    async (user: Address, postId: bigint): Promise<boolean> => {
      const _pub = assertPub()
      const ok = (await _pub.readContract({
        address: HUB_ADDR,
        abi: HUB_ABI,
        functionName: 'hasPostAccess',
        args: [user, postId],
      })) as boolean
      return ok
    },
    [pub]
  )

  /** Is a user’s subscription to creator currently active? */
  const isActive = useCallback(
    async (user: Address, creator: Address): Promise<boolean> => {
      const _pub = assertPub()
      const ok = (await _pub.readContract({
        address: HUB_ADDR,
        abi: HUB_ABI,
        functionName: 'isActive',
        args: [user, creator],
      })) as boolean
      return ok
    },
    [pub]
  )

  /** Indexes for UI */
  const getCreatorPlanIds = useCallback(
    async (creator: Address): Promise<bigint[]> => {
      const _pub = assertPub()
      return (await _pub.readContract({
        address: HUB_ADDR,
        abi: HUB_ABI,
        functionName: 'getCreatorPlanIds',
        args: [creator],
      })) as bigint[]
    },
    [pub]
  )

  const getCreatorPostIds = useCallback(
    async (creator: Address): Promise<bigint[]> => {
      const _pub = assertPub()
      return (await _pub.readContract({
        address: HUB_ADDR,
        abi: HUB_ABI,
        functionName: 'getCreatorPostIds',
        args: [creator],
      })) as bigint[]
    },
    [pub]
  )

  /* ------------------------------ ERC20 helper ----------------------------- */

  const ensureAllowance = useCallback(
    async (token: Address, owner: Address, spender: Address, needed: bigint) => {
      const _pub = assertPub()
      const _wal = assertWallet()
      const current = (await _pub.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender],
      })) as bigint
      if (current >= needed) return

      const { request } = await _pub.simulateContract({
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, needed],
        account: _wal.account,
      })
      const hash = await _wal.writeContract(request)
      await _pub.waitForTransactionReceipt({ hash })
    },
    [pub, wallet]
  )

  /* -------------------------------- Writes -------------------------------- */

  /** Subscribe to a plan for N periods (ETH or ERC20) */
  const subscribe = useCallback(
    async (planId: bigint, periods: number) => {
      const _pub = assertPub()
      assertWallet()
      if (!address) throw new Error('Connect wallet')

      const plan = await readPlan(planId)
      const total = plan.pricePerPeriod * BigInt(periods)

      if (plan.token === ZERO) {
        // native (ETH on Base)
        return send('subscribe', [planId, periods], { value: total })
      } else {
        // ERC20
        await ensureAllowance(plan.token, address, HUB_ADDR, total)
        return send('subscribe', [planId, periods])
      }
    },
    [address, ensureAllowance, readPlan, send, pub, wallet]
  )

  /** Buy a single paid post (ETH or ERC20) */
  const buyPost = useCallback(
    async (postId: bigint) => {
      const _pub = assertPub()
      assertWallet()
      if (!address) throw new Error('Connect wallet')

      const post = await readPost(postId)

      if (post.token === ZERO) {
        return send('buyPost', [postId], { value: post.price })
      } else {
        await ensureAllowance(post.token, address, HUB_ADDR, post.price)
        return send('buyPost', [postId])
      }
    },
    [address, ensureAllowance, readPost, send, pub, wallet]
  )

  /** Creator: create a subscription plan */
  const createPlan = useCallback(
    async (params: {
      token: Address
      pricePerPeriod: bigint
      periodDays: number
      name: string
      metadataURI: string
    }) => {
      return send('createPlan', [
        params.token,
        params.pricePerPeriod,
        params.periodDays,
        params.name,
        params.metadataURI,
      ])
    },
    [send]
  )

  /** Creator: create a paid post */
  const createPost = useCallback(
    async (params: { token: Address; price: bigint; accessViaSub: boolean; uri: string }) => {
      return send('createPost', [
        params.token,
        params.price,
        params.accessViaSub,
        params.uri,
      ])
    },
    [send]
  )

  /** Optional extras you might want in UI */
  const cancelSubscription = useCallback(async (creator: Address) => {
    return send('cancelSubscription', [creator])
  }, [send])

  return {
    // reads
    readPlan,
    readPost,
    hasPostAccess,
    isActive,
    getCreatorPlanIds,
    getCreatorPostIds,
    // writes
    subscribe,
    buyPost,
    createPlan,
    createPost,
    cancelSubscription,
  }
}
