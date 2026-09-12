import type { Address } from 'viem'
import { ProgressBar } from './ProgressBar'
import { Badge, Skeleton } from './ui'
import { formatUsdc, shortAddress } from '../lib/format'
import { useGoalBalance, useGoalMeta } from '../hooks/useGoals'

export function GoalCard({
  vault,
  apy,
  navigate,
}: {
  vault: Address
  apy?: number
  navigate: (path: string) => void
}) {
  const meta = useGoalMeta(vault)
  const { balance } = useGoalBalance(vault, meta.owner)

  const earned =
    balance !== undefined && meta.netDeposited !== undefined
      ? balance > meta.netDeposited
        ? balance - meta.netDeposited
        : 0n
      : undefined
  const progress =
    balance !== undefined && meta.target !== undefined && meta.target > 0n
      ? Number((balance * 10_000n) / meta.target) / 100
      : undefined

  return (
    <button
      onClick={() => navigate(`/goal/${vault}`)}
      className="group w-full rounded-2xl border border-line bg-surface/80 p-5 text-left shadow-[0_12px_32px_-16px_rgba(0,0,0,0.9)] backdrop-blur-sm transition duration-200 ease-soft hover:-translate-y-0.5 hover:border-line-strong hover:bg-raised/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{meta.label ?? shortAddress(vault)}</h3>
          <p className="tnum truncate text-xs text-ink-mute">{shortAddress(vault)}</p>
        </div>
        <Badge tone={meta.mode === 1 ? 'brand' : 'neutral'}>
          {meta.mode === 1 ? 'Yield · Aave' : 'Liquid'} · x{meta.multiplier ?? '–'}
        </Badge>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="tnum text-3xl font-bold tracking-tight">
          {balance === undefined ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <>
              {formatUsdc(balance)} <span className="text-base font-medium text-ink-mute">USDC</span>
            </>
          )}
        </p>
        <p className="tnum shrink-0 text-xs text-ink-soft">
          {meta.target !== undefined && meta.target > 0n
            ? `${progress === undefined ? '' : `${progress.toFixed(0)}% of `}${formatUsdc(meta.target)}`
            : 'no target'}
        </p>
      </div>

      <div className="mt-3">
        <ProgressBar value={progress} />
      </div>

      <div className="mt-3 flex justify-between text-xs text-ink-mute">
        <span className="tnum">
          yield {earned === undefined ? '…' : `+${formatUsdc(earned, 4)} USDC`}
        </span>
        {meta.mode === 1 && apy !== undefined && <span className="tnum">Aave APY {apy.toFixed(2)}%</span>}
      </div>
    </button>
  )
}
