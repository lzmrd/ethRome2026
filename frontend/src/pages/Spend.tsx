import { useEffect, useState } from 'react'
import { isAddress, maxUint256, type Address } from 'viem'
import { useConnection } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi, routerAbi } from '../config/abis'
import { ROUTER, USDC } from '../config/addresses'
import { TxStatus } from '../components/TxStatus'
import { AmountInput, Button, Card, Field, Row, TextInput } from '../components/ui'
import { useUserGoals, useVaultLabels, useGoalMeta } from '../hooks/useGoals'
import { useRoundUpQuote, useRouterAllowance, useUsdcBalance } from '../hooks/useUsdc'
import { formatUsdc, parseUsdc } from '../lib/format'
import { useTx } from '../lib/tx'

export function Spend() {
  const connection = useConnection()
  const owner = connection.address
  const queryClient = useQueryClient()

  const goals = useUserGoals(owner)
  const vaults = goals.data ?? []
  const { labels } = useVaultLabels(vaults)

  const [selected, setSelected] = useState<Address>()
  const [amountInput, setAmountInput] = useState('')
  const [merchantInput, setMerchantInput] = useState(
    (import.meta.env.VITE_DEMO_MERCHANT as string | undefined) ?? '',
  )

  useEffect(() => {
    if (vaults.length > 0 && (!selected || !vaults.includes(selected))) {
      setSelected(vaults[vaults.length - 1])
    }
  }, [selected, vaults])

  const meta = useGoalMeta(selected)
  const amount = parseUsdc(amountInput)
  const quote = useRoundUpQuote(amount, meta.multiplier)
  const saving = quote.data
  const total = amount !== undefined && saving !== undefined ? amount + saving : undefined

  const balance = useUsdcBalance(owner)
  const allowance = useRouterAllowance(owner)
  const merchantValid = merchantInput.trim() !== '' && isAddress(merchantInput.trim())
  const merchant = merchantValid ? (merchantInput.trim() as Address) : undefined

  const needsApproval =
    total !== undefined && allowance.data !== undefined ? allowance.data < total : undefined
  const insufficient = total !== undefined && balance.data !== undefined ? balance.data < total : undefined

  const approval = useTx()
  const payment = useTx()

  useEffect(() => {
    if (approval.phase === 'success') void queryClient.invalidateQueries()
  }, [approval.phase, queryClient])

  useEffect(() => {
    if (payment.phase === 'success') void queryClient.invalidateQueries()
  }, [payment.phase, queryClient])

  const canApprove =
    Boolean(owner) && needsApproval === true && !['simulating', 'signing', 'mining'].includes(approval.phase)
  const canPay =
    Boolean(owner && selected && merchant) &&
    amount !== undefined &&
    amount > 0n &&
    total !== undefined &&
    needsApproval === false &&
    insufficient === false &&
    !['simulating', 'signing', 'mining'].includes(payment.phase)

  async function onApprove() {
    if (!owner) return
    await approval.run({
      account: owner,
      address: USDC,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, maxUint256],
    })
  }

  async function onPay() {
    if (!owner || !selected || !merchant || amount === undefined) return
    await payment.run({
      account: owner,
      address: ROUTER,
      abi: routerAbi,
      functionName: 'payWithRoundUp',
      args: [merchant, amount, selected],
    })
  }

  return (
    <div className="mx-auto max-w-lg">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Spend</h1>
        <p className="mt-1 text-sm text-ink-soft">
          You pay the merchant and the round-up goes into your goal, in a single transaction.
        </p>
      </header>

      <Card className="space-y-5">
        <Field label="Amount (USDC)">
          <AmountInput
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="4.30"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Goal"
            hint={meta.multiplier !== undefined ? `multiplier x${meta.multiplier}` : undefined}
          >
            <select
              value={selected ?? ''}
              onChange={(event) => setSelected(event.target.value as Address)}
              className="w-full rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5 text-sm transition duration-150 ease-soft hover:border-line-strong focus:border-brand focus:outline-none"
            >
              {vaults.map((vault, index) => (
                <option key={vault} value={vault}>
                  {labels[index] ?? vault}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Merchant"
            error={merchantInput.trim() !== '' && !merchantValid ? 'Invalid address.' : undefined}
          >
            <TextInput
              value={merchantInput}
              onChange={(event) => setMerchantInput(event.target.value)}
              placeholder="0x…"
              className="font-mono text-xs"
            />
          </Field>
        </div>

        <div className="rounded-xl border border-line bg-canvas/40 px-4 py-3">
          {amount === undefined || saving === undefined || total === undefined ? (
            <p className="py-1.5 text-sm text-ink-mute">Enter an amount to see the preview.</p>
          ) : (
            <>
              <Row label="Merchant" value={`${formatUsdc(amount)} USDC`} />
              <Row label="Saved into the goal" value={`+${formatUsdc(saving)} USDC`} tone="brand" />
              <Row label="Total charge" value={`${formatUsdc(total)} USDC`} strong />
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-ink-mute">
          <span className="tnum">
            Balance: {balance.data === undefined ? '…' : `${formatUsdc(balance.data)} USDC`}
          </span>
          {insufficient === true && (
            <span className="text-bad">Not enough USDC for payment + saving.</span>
          )}
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
            onClick={onPay}
            disabled={!canPay}
            busy={['simulating', 'signing', 'mining'].includes(payment.phase)}
          >
            Pay and save
          </Button>
          <TxStatus phase={payment.phase} hash={payment.hash} error={payment.error} />
        </div>
      </Card>
    </div>
  )
}
