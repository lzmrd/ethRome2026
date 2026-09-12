import type { Address } from 'viem'
import { ProgressBar } from './ProgressBar'
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
      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-left transition hover:border-neutral-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{meta.label ?? shortAddress(vault)}</h3>
          <p className="text-xs text-neutral-500">{shortAddress(vault)}</p>
        </div>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
          {meta.mode === 1 ? 'Yield · Aave' : 'Liquid'} · x{meta.multiplier ?? '-'}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <p className="text-2xl font-bold">
          {balance === undefined ? '…' : `${formatUsdc(balance)} USDC`}
        </p>
        <p className="text-xs text-neutral-400">
          {meta.target !== undefined && meta.target > 0n
            ? `target ${formatUsdc(meta.target)} USDC`
            : 'no target'}
        </p>
      </div>

      <div className="mt-3">
        <ProgressBar value={progress} />
      </div>

      <div className="mt-3 flex justify-between text-xs text-neutral-400">
        <span>yield {earned === undefined ? '…' : `+${formatUsdc(earned, 4)} USDC`}</span>
        {meta.mode === 1 && apy !== undefined && <span>Aave APY {apy.toFixed(2)}%</span>}
      </div>
    </button>
  )
}
