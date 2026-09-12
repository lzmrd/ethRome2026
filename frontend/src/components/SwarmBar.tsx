import { useLedger } from '../hooks/useLedger'

export function SwarmBar({ ledger }: { ledger: ReturnType<typeof useLedger> }) {
  const { identity, canUpload, uploadMode, uploadIssue, connect, connecting, refresh, readError } = ledger

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
      <div>
        <p className="font-medium">Libretto privato</p>
        {!identity ? (
          <p className="text-xs text-neutral-500">
            Collega la tua identità Swarm per aggiungere il contesto delle spese.
          </p>
        ) : canUpload ? (
          <p className="text-xs text-neutral-500">
            Connesso come {identity.name}. Le note sono cifrate con la tua chiave.
            {uploadMode === 'subsidised' ? ' Caricamento via gateway sovvenzionato.' : ''}
          </p>
        ) : (
          <p className="text-xs text-amber-400">
            {uploadIssue === 'no-stamp'
              ? 'Manca il francobollo postale: puoi leggere, non scrivere.'
              : uploadIssue === 'stamper-failed'
                ? 'Il francobollo c’è ma il percorso di scrittura non è disponibile.'
                : 'Caricamento non disponibile su questa identità.'}
          </p>
        )}
        {readError && <p className="text-xs text-amber-400">{readError}</p>}
      </div>
      {identity ? (
        <button onClick={refresh} className="rounded-lg border border-neutral-700 px-3 py-1 text-xs">
          Rileggi da Swarm
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="rounded-lg border border-emerald-600 px-3 py-1 text-xs text-emerald-400 disabled:opacity-40"
        >
          {connecting ? 'Apro Swarm ID…' : 'Collega Swarm ID'}
        </button>
      )}
    </div>
  )
}
