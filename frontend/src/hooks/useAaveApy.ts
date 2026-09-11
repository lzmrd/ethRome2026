import { useReadContract } from 'wagmi'
import { poolAbi } from '../config/abis'
import { AAVE_POOL, USDC } from '../config/addresses'

const SECONDS_PER_YEAR = 31_536_000

export function useAaveApy(): number | undefined {
  const query = useReadContract({
    address: AAVE_POOL,
    abi: poolAbi,
    functionName: 'getReserveData',
    args: [USDC],
    query: {
      staleTime: 60_000,
      refetchInterval: 120_000,
      select: (data) => {
        const apr = Number(data.currentLiquidityRate) / 1e27
        return (Math.pow(1 + apr / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1) * 100
      },
    },
  })
  return query.data
}
