import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { factoryAbi, vaultAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'

export function useUserGoals(owner?: Address) {
  return useReadContract({
    address: FACTORY,
    abi: factoryAbi,
    functionName: 'goalsOf',
    args: owner ? [owner] : undefined,
    query: { enabled: Boolean(owner), refetchInterval: 15_000 },
  })
}

export function useVaultLabels(vaults: readonly Address[]) {
  const query = useReadContracts({
    contracts: vaults.map((vault) => ({ address: vault, abi: vaultAbi, functionName: 'label' }) as const),
    query: { enabled: vaults.length > 0 },
  })
  return (query.data ?? []).map((result) => (result.status === 'success' ? result.result : undefined))
}

export function useGoalMeta(vault?: Address) {
  const enabled = Boolean(vault)
  const owner = useReadContract({ address: vault, abi: vaultAbi, functionName: 'owner', query: { enabled } })
  const label = useReadContract({ address: vault, abi: vaultAbi, functionName: 'label', query: { enabled } })
  const mode = useReadContract({ address: vault, abi: vaultAbi, functionName: 'mode', query: { enabled } })
  const multiplier = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'multiplier',
    query: { enabled },
  })
  const target = useReadContract({ address: vault, abi: vaultAbi, functionName: 'target', query: { enabled } })
  const netDeposited = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'netDeposited',
    query: { enabled },
  })

  return {
    isLoading: [owner, label, mode, multiplier, target, netDeposited].some((q) => q.isLoading),
    owner: owner.data,
    label: label.data,
    mode: mode.data,
    multiplier: multiplier.data,
    target: target.data,
    netDeposited: netDeposited.data,
  }
}

export function useGoalBalance(vault?: Address, owner?: Address) {
  const enabled = Boolean(vault && owner)
  const balance = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'maxWithdraw',
    args: owner ? [owner] : undefined,
    query: { enabled, refetchInterval: 15_000 },
  })
  const shares = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: { enabled, refetchInterval: 15_000 },
  })

  return {
    isLoading: balance.isLoading || shares.isLoading,
    balance: balance.data,
    shares: shares.data,
    refetch: () => {
      void balance.refetch()
      void shares.refetch()
    },
  }
}
