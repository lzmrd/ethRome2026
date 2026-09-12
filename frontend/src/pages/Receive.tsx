import { useEffect, useState } from 'react'
import { maxUint256 } from 'viem'
import { useConnection } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi, routerAbi } from '../config/abis'
import { ROUTER, USDC } from '../config/addresses'
import { TxStatus } from '../components/TxStatus'
import { AmountInput, Button, Card, Field, Row, Spinner, TextInput } from '../components/ui'
import { useGoalTarget } from '../hooks/useEnsGoal'
import { useGoalMeta } from '../hooks/useGoals'
import { useRoundDownQuote, useRouterAllowance, useUsdcBalance } from '../hooks/useUsdc'
import { formatUsdc, parseUsdc, shortAddress } from '../lib/format'
import { useTx } from '../lib/tx'

export function Receive() {
  const connection = useConnection()
  const payer = connection.address
  const queryClient = useQueryClient()

  const [vaultInput, setVaultInput] = useState('')
  const [amountInput, setAmountInput] = useState('')

  const target = useGoalTarget(vaultInput)
  const vault = target.vault

  const meta = useGoalMeta(vault)
  const amount = parseUsdc(amountInput)
  const quote = useRoundDownQuote(amount, meta.multiplier)
  const saving = quote.data
  const net = amount !== undefined && saving !== undefined ? amount - saving : undefined

  const balance = useUsdcBalance(payer)
  const allowance = useRouterAllowance(payer)
  const insufficient = amount !== undefined && balance.data !== undefined ? balance.data < amount : undefined
  const needsApproval =
    amount !== undefined && allowance.data !== undefined ? allowance.data < amount : undefined

  const approval = useTx()
  const income = useTx()

  useEffect(() => {
    if (approval.phase === 'success') void queryClient.invalidateQueries()
  }, [approval.phase, queryClient])

  useEffect(() => {
    if (income.phase === 'success') void queryClient.invalidateQueries()
  }, [income.phase, queryClient])

  const canApprove =
    Boolean(payer) && needsApproval === true && !['simulating', 'signing', 'mining'].includes(approval.phase)
  const canSend =
    Boolean(payer && vault) &&
    !target.error &&
    !target.isLoading &&
    amount !== undefined &&
    amount > 0n &&
    saving !== undefined &&
    needsApproval === false &&
    insufficient === false &&
    !['simulating', 'signing', 'mining'].includes(income.phase)

  async function onApprove() {
    if (!payer) return
    await approval.run({
      account: payer,
      address: USDC,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, maxUint256],
    })
  }

  async function onSend() {
    if (!payer || !vault || amount === undefined) return
    await income.run({
      account: payer,
      address: ROUTER,
      abi: routerAbi,
      functionName: 'receiveWithRoundDown',
      args: [amount, vault],
    })
  }

  return (
    <div className="mx-auto max-w-lg">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Receive</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Pay in income: the recipient gets the net amount, the rounded difference goes into their goal.
        </p>
      </header>

      <Card className="space-y-5">
        <Field label="ENS name or goal address" error={target.error}>
          <TextInput
            value={vaultInput}
            onChange={(event) => setVaultInput(event.target.value)}
            placeholder="vacanza.mario.formica.eth"
            className="font-mono text-xs"
          />
          <div className="mt-1.5 min-h-4 text-xs text-ink-mute">
            {target.isLoading && (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="size-3" /> resolving…
              </span>
            )}
            {target.kind === 'name' && target.vault && !target.isLoading && (
              <span className="tnum text-good">
                {target.name} → {shortAddress(target.vault)}
              </span>
            )}
            {meta.label !== undefined && meta.owner !== undefined && (
              <span className="ml-2">
                goal "{meta.label}" by {shortAddress(meta.owner)} · x{meta.multiplier}
              </span>
            )}
          </div>
        </Field>

        <Field label="Gross amount (USDC)">
          <AmountInput
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="104.30"
          />
        </Field>

        <div className="rounded-xl border border-line bg-canvas/40 px-4 py-3">
          {amount === undefined || saving === undefined || net === undefined ? (
            <p className="py-1.5 text-sm text-ink-mute">Enter an amount to see the preview.</p>
          ) : (
            <>
              <Row label="Recipient" value={`${formatUsdc(net)} USDC`} />
              <Row label="Saved into the goal" value={`+${formatUsdc(saving)} USDC`} tone="brand" />
              <Row label="Total charge" value={`${formatUsdc(amount)} USDC`} strong />
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-ink-mute">
          <span className="tnum">
            Your balance (payer): {balance.data === undefined ? '…' : `${formatUsdc(balance.data)} USDC`}
          </span>
          {insufficient === true && <span className="text-bad">Not enough USDC balance.</span>}
        </div>

        {needsApproval === true && (
          <div>
            <Button variant="secondary" full onClick={onApprove} disabled={!canApprove}>
              Approve USDC for the router
            </Button>
            <TxStatus phase={approval.phase} hash={approval.hash} error={approval.error} />
          </div>
        )}

        <div>
          <Button
            full
            onClick={onSend}
            disabled={!canSend}
            busy={['simulating', 'signing', 'mining'].includes(income.phase)}
          >
            Send income
          </Button>
          <TxStatus phase={income.phase} hash={income.hash} error={income.error} />
        </div>
      </Card>
    </div>
  )
}
