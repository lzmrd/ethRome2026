import { useLedger } from '../hooks/useLedger'

export function SwarmBar({ ledger }: { ledger: ReturnType<typeof useLedger> }) {
  const { identity, canUpload, uploadMode, uploadIssue, connect, connecting, refresh, readError } = ledger

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
      <div>
        <p className="font-medium">Private ledger</p>
        {!identity ? (
          <p className="text-xs text-neutral-500">
            Connect your Swarm identity to add context to your spending.
          </p>
        ) : canUpload ? (
          <p className="text-xs text-neutral-500">
            Connected as {identity.name}. Notes are encrypted with your key.
            {uploadMode === 'subsidised' ? ' Uploading via subsidised gateway.' : ''}
          </p>
        ) : (
          <p className="text-xs text-amber-400">
            {uploadIssue === 'no-stamp'
              ? 'No postage stamp: you can read, not write.'
              : uploadIssue === 'stamper-failed'
                ? 'The stamp exists but the write path is unavailable.'
                : 'Upload not available for this identity.'}
          </p>
        )}
        {readError && <p className="text-xs text-amber-400">{readError}</p>}
      </div>
      {identity ? (
        <button onClick={refresh} className="rounded-lg border border-neutral-700 px-3 py-1 text-xs">
          Reload from Swarm
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="rounded-lg border border-emerald-600 px-3 py-1 text-xs text-emerald-400 disabled:opacity-40"
        >
          {connecting ? 'Opening Swarm ID…' : 'Connect Swarm ID'}
        </button>
      )}
    </div>
  )
}
