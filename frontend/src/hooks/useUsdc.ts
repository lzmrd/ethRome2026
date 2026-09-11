import type { Address } from 'viem'
import { useReadContract } from 'wagmi'
import { erc20Abi, routerAbi } from '../config/abis'
import { ROUTER, USDC } from '../config/addresses'

export function useUsdcBalance(owner?: Address) {
  return useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: { enabled: Boolean(owner), refetchInterval: 15_000 },
  })
}

export function useRouterAllowance(owner?: Address) {
  return useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner ? [owner, ROUTER] : undefined,
    query: { enabled: Boolean(owner), refetchInterval: 15_000 },
  })
}

export function useRoundUpQuote(amount?: bigint, multiplier?: number) {
  const enabled = amount !== undefined && multiplier !== undefined
  return useReadContract({
    address: ROUTER,
    abi: routerAbi,
    functionName: 'quoteRoundUp',
    args: enabled ? [amount, multiplier] : undefined,
    query: { enabled },
  })
}

export function useRoundDownQuote(amount?: bigint, multiplier?: number) {
  const enabled = amount !== undefined && multiplier !== undefined
  return useReadContract({
    address: ROUTER,
    abi: routerAbi,
    functionName: 'quoteRoundDown',
    args: enabled ? [amount, multiplier] : undefined,
    query: { enabled },
  })
}
