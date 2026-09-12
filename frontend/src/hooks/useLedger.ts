import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LEDGER_TOPIC } from '../config/swarm'
import {
  EMPTY_LEDGER,
  encodeLedger,
  tryDecodeLedger,
  upsertEntry,
  type Ledger,
  type LedgerEntry,
} from '../lib/swarm/ledger'
import { useSwarm } from './useSwarm'

export function useLedger() {
  const swarm = useSwarm()
  const queryClient = useQueryClient()
  const owner = swarm.keys?.owner

  const query = useQuery({
    queryKey: ['swarm-ledger', owner],
    enabled: Boolean(swarm.client && swarm.keys),
    queryFn: async (): Promise<Ledger> => {
      if (!swarm.client || !swarm.keys) return EMPTY_LEDGER
      const reader = swarm.client.makeSequentialFeedReader({ topic: LEDGER_TOPIC, owner: swarm.keys.owner })
      let payload: Uint8Array
      try {
        ;({ payload } = await reader.downloadRawPayload({ encryptionKey: swarm.keys.encryptionKey }))
      } catch {
        // Feed mai scritto: non è un errore, è un libretto vuoto.
        return EMPTY_LEDGER
      }
      if (payload.length === 0) return EMPTY_LEDGER
      const ledger = tryDecodeLedger(payload)
      if (!ledger) throw new Error('Libretto non leggibile con questa identità')
      return ledger
    },
  })

  const mutation = useMutation({
    mutationFn: async (entry: LedgerEntry) => {
      if (!swarm.client || !swarm.keys) throw new Error('Identità Swarm non connessa')
      if (!swarm.canUpload) throw new Error('Manca il francobollo postale: non posso scrivere su Swarm')
      const next = upsertEntry(query.data ?? EMPTY_LEDGER, entry)
      const writer = swarm.client.makeSequentialFeedWriter({ topic: LEDGER_TOPIC, signer: swarm.keys.signer })
      const result = await writer.uploadRawPayload(encodeLedger(next), { encryptionKey: swarm.keys.encryptionKey })
      return { ledger: next, reference: result.reference, feedIndex: result.feedIndex }
    },
    onSuccess: ({ ledger }) => queryClient.setQueryData(['swarm-ledger', owner], ledger),
  })

  return {
    ...swarm,
    ledger: query.data ?? EMPTY_LEDGER,
    isLoading: query.isLoading,
    readError: query.error?.message,
    /** Rilegge dal feed ignorando la copia in memoria: è la prova del recupero. */
    refresh: () => queryClient.invalidateQueries({ queryKey: ['swarm-ledger', owner] }),
    save: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error?.message,
  }
}
