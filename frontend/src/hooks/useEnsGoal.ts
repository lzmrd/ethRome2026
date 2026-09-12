import { useQuery } from '@tanstack/react-query'
import { isAddress, type Address } from 'viem'
import { normalize } from 'viem/ens'
import { usePublicClient, useReadContract } from 'wagmi'
import { factoryAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'
import { FUJI_COIN_TYPE, SEPOLIA_CHAIN_ID, UNIVERSAL_RESOLVER } from '../config/ens'

export type GoalTarget = {
  kind: 'empty' | 'address' | 'name'
  vault?: Address
  name?: string
  isLoading: boolean
  error?: string
}

/**
 * Accetta un indirizzo o un nome ENS. Sul nome: risolve su Sepolia il record
 * addr del coinType di Fuji, poi verifica su Fuji che l'indirizzo sia un vault
 * della nostra factory — un nome può puntare ovunque.
 */
export function useGoalTarget(input: string): GoalTarget {
  const trimmed = input.trim()
  const sepolia = usePublicClient({ chainId: SEPOLIA_CHAIN_ID })
  const looksLikeName = trimmed.includes('.')

  const resolution = useQuery({
    queryKey: ['ens-goal', trimmed],
    enabled: looksLikeName && Boolean(sepolia),
    staleTime: 30_000,
    queryFn: async (): Promise<Address | null> => {
      if (!sepolia) return null
      const address = await sepolia.getEnsAddress({
        name: normalize(trimmed),
        coinType: FUJI_COIN_TYPE,
        universalResolverAddress: UNIVERSAL_RESOLVER,
      })
      return (address as Address | null) ?? null
    },
  })

  const candidate: Address | undefined = looksLikeName
    ? (resolution.data ?? undefined)
    : isAddress(trimmed)
      ? (trimmed as Address)
      : undefined

  const isVault = useReadContract({
    address: FACTORY,
    abi: factoryAbi,
    functionName: 'isVault',
    args: candidate ? [candidate] : undefined,
    query: { enabled: Boolean(candidate) },
  })

  if (trimmed === '') return { kind: 'empty', isLoading: false }

  const isLoading = (looksLikeName && resolution.isLoading) || isVault.isLoading
  const kind = looksLikeName ? 'name' : 'address'

  if (looksLikeName && resolution.isError) {
    return { kind, isLoading: false, error: 'Nome non risolvibile su Sepolia' }
  }
  if (looksLikeName && !resolution.isLoading && !resolution.data) {
    return { kind, isLoading: false, error: 'Questo nome non ha un indirizzo su Fuji' }
  }
  if (!looksLikeName && !isAddress(trimmed)) {
    return { kind, isLoading: false, error: 'Indirizzo non valido' }
  }
  if (candidate && isVault.data === false) {
    return { kind, vault: candidate, isLoading: false, error: 'Non è un goal Formica' }
  }

  return { kind, vault: candidate, name: looksLikeName ? trimmed : undefined, isLoading }
}
