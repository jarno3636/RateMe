// hooks/useCreatorHub.ts
import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { erc20Abi, getContract } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { CREATOR_HUB, CREATOR_HUB_ABI } from '@/lib/creatorHub'

type Plan = {
  creator: Address
  token: Address
  pricePerPeriod: bigint
  periodDays: number
  active: boolean
  name: string
  metadataURI: string
}

type Post = {
  creator: Address
  token: Address
  price: bigint
  active: boolean
  accessViaSub: boolean
  uri: string
}

const ZERO: Address = '0x0000000000000000000000000000000000000000'

export function useCreatorHub() {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()

  // Strongly typed contracts (read + write)
  const hubRead = useMemo(() => {
    if (!pub) return null
    return getContract({
      address: CREATOR_HUB,
      abi: CREATOR_HUB_ABI,
      client: { public: pub },
    })
  }, [pub])

  const hubWrite = useMemo(() => {
    if (!wallet) return null
    return getContract({
      address: CREATOR_HUB,
      abi: CREATOR_HUB_ABI,
      client: { wallet },
    })
  }, [wallet])

  const readPlan = useCallback(
    async (id: bigint) => {
      if (!hubRead) throw new Error('Public client unavailable')
      // returns tuple as defined by ABI
      const p = await hubRead.read.plans([id])
      const plan: Plan = {
        creator: p[0],
        token: p[1],
        pricePerPeriod: p[2],
        periodDays: Number(p[3]),
        active: p[4],
        name: p[5],
        metadataURI: p[6],
      }
      return plan
    },
    [hubRead]
  )

  const readPost = useCallback(
    async (id: bigint) => {
      if (!hubRead) throw new Error('Public client unavailable')
      const p = await hubRead.read.posts([id])
      const post: Post = {
        creator: p[0],
        token: p[1],
        price: p[2],
        active: p[3],
        accessViaSub: p[4],
        uri: p[5],
      }
      return post
    },
    [hubRead]
  )

  // Approve ERC20 if needed
  const ensureAllowance = useCallback(
    async (token: Address, owner: Address, spender: Address, needed: bigint) => {
      if (!pub) throw new Error('Public client unavailable')

      const allowance = (await pub.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender],
      })) as bigint

      if (allowance >= needed) return
      if (!wallet) throw new Error('Connect wallet')

      const { request } = await pub.simulateContract({
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, needed],
        account: wallet.account!,
      })
      const hash = await wallet.writeContract(request)
      await pub.waitForTransactionReceipt({ hash })
    },
    [pub, wallet]
  )

  // Subscribe: ETH (value) or ERC20 (approve)
  const subscribe = useCallback(
    async (planId: bigint, periods: number) => {
      if (!address) throw new Error('Connect wallet')
      if (!wallet) throw new Error('Connect wallet')
      if (!hubRead || !hubWrite || !pub) throw new Error('Clients unavailable')

      const plan = await readPlan(planId)
      const total = plan.pricePerPeriod * BigInt(periods)

      if (plan.token === ZERO) {
        const { request } = await hubRead.simulate.subscribe([planId, periods], {
          account: wallet.account!,
          value: total,
        })
        const hash = await hubWrite.write.subscribe(request)
        return pub.waitForTransactionReceipt({ hash })
      } else {
        await ensureAllowance(plan.token, address, CREATOR_HUB, total)
        const { request } = await hubRead.simulate.subscribe([planId, periods], {
          account: wallet.account!,
        })
        const hash = await hubWrite.write.subscribe(request)
        return pub.waitForTransactionReceipt({ hash })
      }
    },
    [address, ensureAllowance, hubRead, hubWrite, pub, readPlan, wallet]
  )

  // Buy post: ETH (value) or ERC20 (approve)
  const buyPost = useCallback(
    async (postId: bigint) => {
      if (!address) throw new Error('Connect wallet')
      if (!wallet) throw new Error('Connect wallet')
      if (!hubRead || !hubWrite || !pub) throw new Error('Clients unavailable')

      const post = await readPost(postId)

      if (post.token === ZERO) {
        const { request } = await hubRead.simulate.buyPost([postId], {
          account: wallet.account!,
          value: post.price,
        })
        const hash = await hubWrite.write.buyPost(request)
        return pub.waitForTransactionReceipt({ hash })
      } else {
        await ensureAllowance(post.token, address, CREATOR_HUB, post.price)
        const { request } = await hubRead.simulate.buyPost([postId], {
          account: wallet.account!,
        })
        const hash = await hubWrite.write.buyPost(request)
        return pub.waitForTransactionReceipt({ hash })
      }
    },
    [address, ensureAllowance, hubRead, hubWrite, pub, readPost, wallet]
  )

  // Creator helpers
  const createPlan = useCallback(
    async (params: {
      token: Address
      pricePerPeriod: bigint
      periodDays: number
      name: string
      metadataURI: string
    }) => {
      if (!wallet) throw new Error('Connect wallet')
      if (!hubRead || !hubWrite || !pub) throw new Error('Clients unavailable')

      const { request } = await hubRead.simulate.createPlan(
        [params.token, params.pricePerPeriod, params.periodDays, params.name, params.metadataURI],
        { account: wallet.account! }
      )
      const hash = await hubWrite.write.createPlan(request)
      return pub.waitForTransactionReceipt({ hash })
    },
    [hubRead, hubWrite, pub, wallet]
  )

  const createPost = useCallback(
    async (params: { token: Address; price: bigint; accessViaSub: boolean; uri: string }) => {
      if (!wallet) throw new Error('Connect wallet')
      if (!hubRead || !hubWrite || !pub) throw new Error('Clients unavailable')

      const { request } = await hubRead.simulate.createPost(
        [params.token, params.price, params.accessViaSub, params.uri],
        { account: wallet.account! }
      )
      const hash = await hubWrite.write.createPost(request)
      return pub.waitForTransactionReceipt({ hash })
    },
    [hubRead, hubWrite, pub, wallet]
  )

  return {
    readPlan,
    readPost,
    subscribe,
    buyPost,
    createPlan,
    createPost,
  }
}
