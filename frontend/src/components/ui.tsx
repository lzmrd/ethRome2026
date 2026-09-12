import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/** Unisce classi ignorando i rami falsi, senza aggiungere una dipendenza. */
export function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-line bg-surface/80 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_12px_32px_-12px_rgba(0,0,0,0.8)] backdrop-blur-sm',
        padded && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">{children}</h2>
      {hint && <span className="text-xs text-ink-mute">{hint}</span>}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  busy?: boolean
  full?: boolean
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-brand text-neutral-950 hover:bg-brand-soft active:translate-y-px shadow-[0_6px_20px_-8px_rgba(245,165,36,0.8)]',
  secondary: 'border border-line-strong bg-raised text-ink hover:border-ink-mute hover:bg-line',
  ghost: 'text-ink-soft hover:bg-raised hover:text-ink',
  danger: 'border border-bad/40 text-bad hover:bg-bad/10',
}

export function Button({
  variant = 'primary',
  size = 'md',
  busy = false,
  full = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-150 ease-soft',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        full && 'w-full',
        VARIANTS[variant],
        className,
      )}
    >
      {busy && <Spinner />}
      {children}
    </button>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70',
        className,
      )}
    />
  )
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium tracking-wide text-ink-soft uppercase">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <span className="mt-1.5 block text-xs text-bad">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-mute">{hint}</span>
      ) : null}
    </label>
  )
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cx(
        'w-full rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5 text-sm text-ink',
        'placeholder:text-ink-mute transition duration-150 ease-soft',
        'hover:border-line-strong focus:border-brand focus:outline-none',
        className,
      )}
    />
  )
}

/** Campo importo: cifre grandi, incolonnate, tastierino numerico su mobile. */
export function AmountInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <TextInput
      inputMode="decimal"
      autoComplete="off"
      {...rest}
      className={cx('py-3 text-2xl font-semibold tnum', className)}
    />
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'good' | 'bad'
}) {
  const tones = {
    neutral: 'border-line bg-raised text-ink-soft',
    brand: 'border-brand/30 bg-brand/10 text-brand-soft',
    good: 'border-good/30 bg-good/10 text-good',
    bad: 'border-bad/30 bg-bad/10 text-bad',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('inline-block animate-pulse rounded bg-line align-middle', className)} />
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-mute">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

/** Riga etichetta/valore dei riepiloghi: valori sempre incolonnati a destra. */
export function Row({
  label,
  value,
  strong = false,
  tone,
}: {
  label: ReactNode
  value: ReactNode
  strong?: boolean
  tone?: 'brand' | 'good'
}) {
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-4 py-1.5',
        strong && 'border-t border-line pt-2.5 font-semibold',
      )}
    >
      <span className="text-sm text-ink-soft">{label}</span>
      <span
        className={cx(
          'tnum text-sm',
          tone === 'brand' ? 'text-brand-soft' : tone === 'good' ? 'text-good' : 'text-ink',
        )}
      >
        {value}
      </span>
    </div>
  )
}
