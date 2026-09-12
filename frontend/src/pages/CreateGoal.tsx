import { useEffect, useState } from 'react'
import { decodeEventLog, isAddress, type Address } from 'viem'
import { normalize } from 'viem/ens'
import { useConnection } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { factoryAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'
import { TxStatus } from '../components/TxStatus'
import { Button, Card, Field, TextInput, cx } from '../components/ui'
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
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create a goal</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Each goal is a separate ERC-4626 vault. The name becomes its ENS subname.
        </p>
      </header>

      <Card className="space-y-5">
        <Field
          label="Name"
          error={
            labelInput.trim() !== '' && label === undefined
              ? 'Invalid name: lowercase letters, numbers and hyphens; no dots.'
              : duplicate
                ? 'You already have a goal with this name.'
                : undefined
          }
          hint={label !== undefined && !duplicate ? `normalized name: ${label}` : undefined}
        >
          <TextInput
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            placeholder="vacanza"
          />
        </Field>

        <fieldset>
          <legend className="text-xs font-medium tracking-wide text-ink-soft uppercase">Mode</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {[
              { value: 0 as const, title: 'Liquid', sub: 'no risk' },
              { value: 1 as const, title: 'Yield', sub: 'Aave V3' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                aria-pressed={mode === option.value}
                className={cx(
                  'rounded-xl border px-3 py-2.5 text-left transition duration-150 ease-soft',
                  mode === option.value
                    ? 'border-brand bg-brand/10 text-ink'
                    : 'border-line text-ink-soft hover:border-line-strong hover:bg-raised',
                )}
              >
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="block text-xs text-ink-mute">{option.sub}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Multiplier (1-10)" error={!multiplierValid ? 'From 1 to 10.' : undefined}>
            <TextInput
              type="number"
              min={1}
              max={10}
              value={multiplier}
              onChange={(event) => setMultiplier(Number(event.target.value))}
              className="tnum"
            />
          </Field>
          <Field
            label="Target in USDC (optional)"
            error={targetInput.trim() !== '' && target === undefined ? 'Invalid amount.' : undefined}
          >
            <TextInput
              value={targetInput}
              onChange={(event) => setTargetInput(event.target.value)}
              inputMode="decimal"
              className="tnum"
            />
          </Field>
        </div>

        <p className="rounded-xl border border-line bg-canvas/40 px-4 py-3 text-xs text-ink-soft">
          Preview: <span className="text-ink">{label ?? '…'}</span> ·{' '}
          {mode === 1 ? 'Yield on Aave' : 'Liquid'} · x{multiplier} · target{' '}
          <span className="tnum">{target === undefined ? '…' : `${formatUsdc(target)} USDC`}</span>
        </p>

        <div>
          <Button
            full
            onClick={onSubmit}
            disabled={!canSubmit}
            busy={['simulating', 'signing', 'mining'].includes(phase)}
          >
            Create goal on Fuji
          </Button>
          <TxStatus phase={phase} hash={hash} error={error} />
        </div>
      </Card>
    </div>
  )
}
