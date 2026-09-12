import type { ReactNode } from 'react'
import { cx } from './ui'

/**
 * Il diagramma che l'utente vede prima di firmare: una sorgente, piu'
 * destinazioni e un tronco che le tiene insieme, perche' partono tutte dalla
 * stessa transazione. Solo presentazione: gli importi arrivano gia' pronti da
 * chi lo usa, che li legge dal contratto.
 */

export type FlowLeg = {
  title: string
  sub?: string
  /** Importo gia' formattato, unita' inclusa. Assente = ancora sconosciuto. */
  amount?: string
  tone?: 'neutral' | 'brand'
  /** Gamba che non muove denaro: resta visibile ma spenta. */
  faded?: boolean
}

export function PaymentFlow({
  source,
  legs,
  steps,
  footnote,
}: {
  source: { title: string; sub?: string; amount?: string }
  legs: FlowLeg[]
  steps: string
  footnote?: ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-canvas/40 p-3.5">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-medium tracking-wide text-ink-soft uppercase">Before you sign</h3>
        <span className="shrink-0 text-[11px] text-ink-mute">{steps}</span>
      </header>

      <div className="flex items-stretch">
        <div className="flex w-[34%] max-w-32 min-w-0 items-center">
          <SourceNode {...source} />
        </div>

        {/* I connettori sono una colonna a se': le righe restano allineate ai
            riquadri di destra perche' hanno la stessa altezza e lo stesso gap. */}
        <div className="flex w-9 shrink-0 flex-col gap-2 sm:w-12">
          {legs.map((leg, index) => (
            <Arrow
              key={index}
              tone={leg.tone}
              faded={leg.faded}
              trunk={legs.length < 2 ? 'none' : index === 0 ? 'down' : index === legs.length - 1 ? 'up' : 'both'}
            />
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {legs.map((leg, index) => (
            <Node key={index} {...leg} />
          ))}
        </div>
      </div>

      {footnote && <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">{footnote}</p>}
    </section>
  )
}

/** La sorgente impila l'importo su una riga sua: e' il totale che lascia il
    portafoglio, e cosi' non si tronca nemmeno su uno schermo da telefono. */
function SourceNode({ title, sub, amount }: { title: string; sub?: string; amount?: string }) {
  return (
    <div className="w-full min-w-0 rounded-xl border border-line bg-surface/70 px-3 py-2">
      <p className="truncate text-[11px] text-ink-soft">{title}</p>
      <p className={cx('tnum mt-0.5 truncate text-sm font-semibold', amount === undefined ? 'text-ink-mute' : 'text-ink')}>
        {amount ?? '—'}
      </p>
      <p className="truncate text-[11px] text-ink-mute">{sub ?? '\u00a0'}</p>
    </div>
  )
}

function Node({
  title,
  sub,
  amount,
  tone = 'neutral',
  faded = false,
  className,
}: FlowLeg & { className?: string }) {
  return (
    <div
      className={cx(
        'min-w-0 rounded-xl border px-3 py-2',
        tone === 'brand' ? 'border-brand/30 bg-brand/5' : 'border-line bg-surface/70',
        faded && 'opacity-55',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-ink">{title}</span>
        <span
          className={cx(
            'tnum shrink-0 text-xs font-semibold',
            amount === undefined ? 'text-ink-mute' : tone === 'brand' ? 'text-brand-soft' : 'text-ink',
          )}
        >
          {amount ?? '—'}
        </span>
      </div>
      {/* Lo spazio unificatore tiene la seconda riga anche senza sottotitolo:
          senza, i riquadri perderebbero l'allineamento con le frecce. */}
      <p className="mt-0.5 truncate text-[11px] text-ink-mute">{sub ?? '\u00a0'}</p>
    </div>
  )
}

function Arrow({
  tone = 'neutral',
  faded = false,
  trunk,
}: {
  tone?: 'neutral' | 'brand'
  faded?: boolean
  trunk: 'up' | 'down' | 'both' | 'none'
}) {
  return (
    <div aria-hidden className={cx('relative flex flex-1 items-center', faded && 'opacity-55')}>
      {trunk !== 'none' && (
        <span
          className={cx(
            'absolute left-0 w-px bg-line-strong',
            trunk === 'down' ? 'top-1/2 -bottom-2' : trunk === 'up' ? '-top-2 bottom-1/2' : '-top-2 -bottom-2',
          )}
        />
      )}
      <span className={cx('h-px flex-1', tone === 'brand' ? 'bg-brand/40' : 'bg-line-strong')} />
      <svg
        viewBox="0 0 6 8"
        fill="none"
        className={cx('h-2 w-1.5', tone === 'brand' ? 'text-brand/60' : 'text-line-strong')}
      >
        <path d="M1 1 4.6 4 1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
