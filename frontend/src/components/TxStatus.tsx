import type { Hex } from 'viem'
import { SNOWTRACE_TX } from '../config/addresses'
import type { TxPhase } from '../lib/tx'

const LABELS: Record<TxPhase, string> = {
  idle: '',
  simulating: 'Simulating transaction…',
  signing: 'Confirm in your wallet…',
  mining: 'Waiting for confirmation…',
  success: 'Transaction confirmed',
  error: 'Error',
}

export function TxStatus({ phase, hash, error }: { phase: TxPhase; hash?: Hex; error?: string }) {
  if (phase === 'idle') return null
  const color =
    phase === 'error' ? 'text-red-400' : phase === 'success' ? 'text-emerald-400' : 'text-amber-300'
  return (
    <div className={`mt-3 text-sm ${color}`}>
      <p>{phase === 'error' ? error : LABELS[phase]}</p>
      {hash && (
        <a
          className="underline decoration-dotted"
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
