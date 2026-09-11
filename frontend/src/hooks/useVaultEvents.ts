import { useQuery } from '@tanstack/react-query'
import type { Address, Hex } from 'viem'
import { usePublicClient } from 'wagmi'
import { vaultAbi } from '../config/abis'
import { DEPLOY_BLOCK } from '../config/addresses'

const CHUNK = 1024n
const MAX_EVENTS = 20

export type VaultEvent = {
  kind: 'Deposit' | 'Withdraw'
  assets: bigint
  transactionHash: Hex
  blockNumber: bigint
}

export function useVaultEvents(vault: Address) {
  const client = usePublicClient()

  return useQuery({
    queryKey: ['vault-events', vault],
    enabled: Boolean(client),
    refetchInterval: 15_000,
    queryFn: async (): Promise<VaultEvent[]> => {
      if (!client) return []
      const latest = await client.getBlockNumber()
      const events: VaultEvent[] = []

      for (let from = DEPLOY_BLOCK; from <= latest; from += CHUNK) {
        const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n
        const [deposits, withdrawals] = await Promise.all([
          client.getContractEvents({ address: vault, abi: vaultAbi, eventName: 'Deposit', fromBlock: from, toBlock: to }),
          client.getContractEvents({
            address: vault,
            abi: vaultAbi,
            eventName: 'Withdraw',
            fromBlock: from,
            toBlock: to,
          }),
        ])
        for (const log of deposits) {
          const args = log.args as { assets: bigint }
          events.push({ kind: 'Deposit', assets: args.assets, transactionHash: log.transactionHash, blockNumber: log.blockNumber })
        }
        for (const log of withdrawals) {
          const args = log.args as { assets: bigint }
          events.push({ kind: 'Withdraw', assets: args.assets, transactionHash: log.transactionHash, blockNumber: log.blockNumber })
        }
      }

      return events.sort((a, b) => Number(b.blockNumber - a.blockNumber)).slice(0, MAX_EVENTS)
    },
  })
}
