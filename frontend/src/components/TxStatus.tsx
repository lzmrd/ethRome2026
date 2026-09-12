import type { Hex } from 'viem'
import { SNOWTRACE_TX } from '../config/addresses'
import type { TxPhase } from '../lib/tx'
import { Spinner, cx } from './ui'

const LABELS: Record<TxPhase, string> = {
  idle: '',
  simulating: 'Simulating transaction…',
  signing: 'Confirm in your wallet…',
  mining: 'Waiting for confirmation…',
  success: 'Transaction confirmed',
  error: 'Error',
}

const PENDING: TxPhase[] = ['simulating', 'signing', 'mining']

export function TxStatus({ phase, hash, error }: { phase: TxPhase; hash?: Hex; error?: string }) {
  if (phase === 'idle') return null

  const pending = PENDING.includes(phase)
  const tone =
    phase === 'error'
      ? 'border-bad/30 bg-bad/5 text-bad'
      : phase === 'success'
        ? 'border-good/30 bg-good/5 text-good'
        : 'border-brand/30 bg-brand/5 text-brand-soft'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx('mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-sm', tone)}
    >
      {pending ? <Spinner /> : <span aria-hidden>{phase === 'success' ? '✓' : '!'}</span>}
      <span className="min-w-0 flex-1 break-words">{phase === 'error' ? error : LABELS[phase]}</span>
      {hash && (
        <a
          className="tnum shrink-0 text-xs underline decoration-dotted underline-offset-2 opacity-80 hover:opacity-100"
          href={`${SNOWTRACE_TX}${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          {hash.slice(0, 10)}…{hash.slice(-8)}
        </a>
      )}
    </div>
  )
}
