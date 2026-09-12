import { useLedger } from '../hooks/useLedger'
import { Button } from './ui'

export function SwarmBar({ ledger }: { ledger: ReturnType<typeof useLedger> }) {
  const { identity, canUpload, uploadMode, uploadIssue, connect, connecting, refresh, readError } = ledger

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/60 px-4 py-3 backdrop-blur-sm">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className="text-ink-mute">🔒</span>
          Private ledger
          {identity && (
            <span className="rounded-full border border-line bg-raised px-2 py-0.5 text-[10px] text-ink-soft">
              {identity.name}
            </span>
          )}
        </p>
        {!identity ? (
          <p className="mt-0.5 text-xs text-ink-mute">
            Connect your Swarm identity to add context to your spending.
          </p>
        ) : canUpload ? (
          <p className="mt-0.5 text-xs text-ink-mute">
            Connected as {identity.name}. Notes are encrypted with your key.
            {uploadMode === 'subsidised' ? ' Uploading via subsidised gateway.' : ''}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-brand-soft">
            {uploadIssue === 'no-stamp'
              ? 'No postage stamp: you can read, not write.'
              : uploadIssue === 'stamper-failed'
                ? 'The stamp exists but the write path is unavailable.'
                : 'Upload not available for this identity.'}
          </p>
        )}
        {readError && <p className="mt-0.5 text-xs text-brand-soft">{readError}</p>}
      </div>

      {identity ? (
        <Button size="sm" variant="secondary" onClick={refresh}>
          Reload from Swarm
        </Button>
      ) : (
        <Button size="sm" onClick={connect} busy={connecting}>
          {connecting ? 'Opening Swarm ID…' : 'Connect Swarm ID'}
        </Button>
      )}
    </div>
  )
}
