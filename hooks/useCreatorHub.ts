// hooks/useCreatorHub.ts
import { useCallback } from 'react'
import type { Address, Abi } from 'viem'
import { erc20Abi } from 'viem'
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

  const readPlan = useCallback(
    async (id: bigint): Promise<Plan> => {
      if (!pub) throw new Error('Public client unavailable')
      const p = await (pub as any).readContract({
        address: CREATOR_HUB as Address,
        abi: CREATOR_HUB_ABI as Abi,      // 👈 pass as Abi (no `as const` here)
        functionName: 'plans',
        args: [id],
      })
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
    [pub]
  )

  const readPost = useCallback(
    async (id: bigint): Promise<Post> => {
      if (!pub) throw new Error('Public client unavailable')
      const p = await (pub as any).readContract({
        address: CREATOR_HUB as Address,
        abi: CREATOR_HUB_ABI as Abi,      // 👈 pass as Abi (no `as const`)
        functionName: 'posts',
        args: [id],
      })
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
    [pub]
  )

  const ensureAllowance = useCallback(
    async (token: Address, owner: Address, spender: Address, needed: bigint) => {
      if (!pub) throw new Error('Public client unavailable')
      const allowance = (await (pub as any).readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender],
      })) as bigint
      if (allowance >= needed) return
      if (!wallet) throw new Error('Connect wallet')

      const { request } = await (pub as any).simulateContract({
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

  const subscribe = useCallback(
    async (planId: bigint, periods: number) => {
      if (!address || !wallet) throw new Error('Connect wallet')
      if (!pub) throw new Error('Public client unavailable')

      const plan = await readPlan(planId)
      const total = plan.pricePerPeriod * BigInt(periods)

      if (plan.token === ZERO) {
        const { request } = await (pub as any).simulateContract({
          address: CREATOR_HUB as Address,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'subscribe',
          args: [planId, periods],
          account: wallet.account!,
          value: total,
        })
        const hash = await wallet.writeContract(request)
        return pub.waitForTransactionReceipt({ hash })
      } else {
        await ensureAllowance(plan.token, address, CREATOR_HUB as Address, total)
        const { request } = await (pub as any).simulateContract({
          address: CREATOR_HUB as Address,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'subscribe',
          args: [planId, periods],
          account: wallet.account!,
        })
        const hash = await wallet.writeContract(request)
        return pub.waitForTransactionReceipt({ hash })
      }
    },
    [address, wallet, pub, readPlan, ensureAllowance]
  )

  const buyPost = useCallback(
    async (postId: bigint) => {
      if (!address || !wallet) throw new Error('Connect wallet')
      if (!pub) throw new Error('Public client unavailable')

      const post = await readPost(postId)

      if (post.token === ZERO) {
        const { request } = await (pub as any).simulateContract({
          address: CREATOR_HUB as Address,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'buyPost',
          args: [postId],
          account: wallet.account!,
          value: post.price,
        })
        const hash = await wallet.writeContract(request)
        return pub.waitForTransactionReceipt({ hash })
      } else {
        await ensureAllowance(post.token, address, CREATOR_HUB as Address, post.price)
        const { request } = await (pub as any).simulateContract({
          address: CREATOR_HUB as Address,
          abi: CREATOR_HUB_ABI as Abi,
          functionName: 'buyPost',
          args: [postId],
          account: wallet.account!,
        })
        const hash = await wallet.writeContract(request)
        return pub.waitForTransactionReceipt({ hash })
      }
    },
    [address, wallet, pub, readPost, ensureAllowance]
  )

  const createPlan = useCallback(
    async (params: {
      token: Address
      pricePerPeriod: bigint
      periodDays: number
      name: string
      metadataURI: string
    }) => {
      if (!wallet) throw new Error('Connect wallet')
      if (!pub) throw new Error('Public client unavailable')

      const { request } = await (pub as any).simulateContract({
        address: CREATOR_HUB as Address,
        abi: CREATOR_HUB_ABI as Abi,
        functionName: 'createPlan',
        args: [params.token, params.pricePerPeriod, params.periodDays, params.name, params.metadataURI],
        account: wallet.account!,
      })
      const hash = await wallet.writeContract(request)
      return pub.waitForTransactionReceipt({ hash })
    },
    [pub, wallet]
  )

  const createPost = useCallback(
    async (params: { token: Address; price: bigint; accessViaSub: boolean; uri: string }) => {
      if (!wallet) throw new Error('Connect wallet')
      if (!pub) throw new Error('Public client unavailable')

      const { request } = await (pub as any).simulateContract({
        address: CREATOR_HUB as Address,
        abi: CREATOR_HUB_ABI as Abi,
        functionName: 'createPost',
        args: [params.token, params.price, params.accessViaSub, params.uri],
        account: wallet.account!,
      })
      const hash = await wallet.writeContract(request)
      return pub.waitForTransactionReceipt({ hash })
    },
    [pub, wallet]
  )

  return { readPlan, readPost, subscribe, buyPost, createPlan, createPost }
}
