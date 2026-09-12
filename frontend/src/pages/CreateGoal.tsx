import { useEffect, useState } from 'react'
import { decodeEventLog, isAddress, type Address } from 'viem'
import { normalize } from 'viem/ens'
import { useConnection } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { factoryAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'
import { TxStatus } from '../components/TxStatus'
import { useUserGoals, useVaultLabels } from '../hooks/useGoals'
import { formatUsdc, parseUsdc } from '../lib/format'
import { useTx } from '../lib/tx'

function normalizeLabel(input: string): string | undefined {
  const trimmed = input.trim()
  if (!trimmed || trimmed.includes('.')) return undefined
  try {
    return normalize(trimmed)
  } catch {
    return undefined
  }
}

export function CreateGoal({ navigate }: { navigate: (path: string) => void }) {
  const connection = useConnection()
  const owner = connection.address
  const queryClient = useQueryClient()

  const [labelInput, setLabelInput] = useState('')
  const [mode, setMode] = useState(0)
  const [multiplier, setMultiplier] = useState(3)
  const [targetInput, setTargetInput] = useState('20')

  const goals = useUserGoals(owner)
  const { labels: existingLabels, isLoading: labelsLoading } = useVaultLabels(goals.data ?? [])

  const { phase, hash, error, run, receipt } = useTx()

  const label = normalizeLabel(labelInput)
  const target = targetInput.trim() === '' ? 0n : parseUsdc(targetInput)
  const duplicate = label !== undefined && existingLabels.some((existing) => existing === label)
  const multiplierValid = Number.isInteger(multiplier) && multiplier >= 1 && multiplier <= 10
  const canSubmit =
    Boolean(owner) &&
    !goals.isLoading &&
    !labelsLoading &&
    label !== undefined &&
    !duplicate &&
    multiplierValid &&
    target !== undefined &&
    !['simulating', 'signing', 'mining'].includes(phase)

  useEffect(() => {
    if (phase !== 'success' || !receipt.data) return
    for (const log of receipt.data.logs) {
      try {
        const decoded = decodeEventLog({
          abi: factoryAbi,
          eventName: 'GoalCreated',
          data: log.data,
          topics: log.topics,
        })
        const vault = decoded.args.vault as Address
        if (isAddress(vault)) {
          void queryClient.invalidateQueries()
          navigate(`/goal/${vault}`)
          return
        }
      } catch {
        // log di un altro contratto nella stessa ricevuta
      }
    }
  }, [phase, receipt.data, navigate, queryClient])

  async function onSubmit() {
    if (!owner || !label || target === undefined) return
    await run({
      account: owner,
      address: FACTORY,
      abi: factoryAbi,
      functionName: 'createGoal',
      args: [label, mode, multiplier, target],
    })
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">Create a goal</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Each goal is a separate ERC-4626 vault. The name becomes its ENS subname.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-300">Name</span>
          <input
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            placeholder="vacanza"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
          />
          {labelInput.trim() !== '' && label === undefined && (
            <span className="mt-1 block text-xs text-red-400">
              Invalid name: lowercase letters, numbers and hyphens; no dots.
            </span>
          )}
          {duplicate && <span className="mt-1 block text-xs text-red-400">You already have a goal with this name.</span>}
          {label !== undefined && !duplicate && (
            <span className="mt-1 block text-xs text-neutral-500">normalized name: {label}</span>
          )}
        </label>

        <fieldset>
          <legend className="text-sm text-neutral-300">Mode</legend>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setMode(0)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                mode === 0 ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
              }`}
            >
              Liquid (no risk)
            </button>
            <button
              type="button"
              onClick={() => setMode(1)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                mode === 1 ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
              }`}
            >
              Yield (Aave V3)
            </button>
          </div>
        </fieldset>

        <div className="flex gap-4">
          <label className="block flex-1">
            <span className="text-sm text-neutral-300">Multiplier (1-10)</span>
            <input
              type="number"
              min={1}
              max={10}
              value={multiplier}
              onChange={(event) => setMultiplier(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
            />
            {!multiplierValid && <span className="mt-1 block text-xs text-red-400">From 1 to 10.</span>}
          </label>
          <label className="block flex-1">
            <span className="text-sm text-neutral-300">Target in USDC (optional)</span>
            <input
              value={targetInput}
              onChange={(event) => setTargetInput(event.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
            />
            {targetInput.trim() !== '' && target === undefined && (
              <span className="mt-1 block text-xs text-red-400">Invalid amount.</span>
            )}
          </label>
        </div>

        <div className="rounded-lg bg-neutral-900 p-3 text-xs text-neutral-400">
          Preview: {label ?? '…'} · {mode === 1 ? 'Yield on Aave' : 'Liquid'} · x{multiplier} · target{' '}
          {target === undefined ? '…' : `${formatUsdc(target)} USDC`}
        </div>

        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-40"
        >
          Create goal on Fuji
        </button>

        <TxStatus phase={phase} hash={hash} error={error} />
      </div>
    </div>
  )
}
