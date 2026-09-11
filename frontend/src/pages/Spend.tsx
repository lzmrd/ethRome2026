import { useEffect, useState } from 'react'
import { isAddress, maxUint256, type Address } from 'viem'
import { useConnection } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi, routerAbi } from '../config/abis'
import { ROUTER, USDC } from '../config/addresses'
import { TxStatus } from '../components/TxStatus'
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
    if (!selected && vaults.length > 0) setSelected(vaults[0])
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
      <h1 className="text-xl font-bold">Spendi</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Paghi il merchant e il round-up finisce nel tuo goal, in una sola transazione.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-300">Goal</span>
          <select
            value={selected ?? ''}
            onChange={(event) => setSelected(event.target.value as Address)}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
          >
            {vaults.map((vault, index) => (
              <option key={vault} value={vault}>
                {labels[index] ?? vault}
              </option>
            ))}
          </select>
          {meta.multiplier !== undefined && (
            <span className="mt-1 block text-xs text-neutral-500">moltiplicatore x{meta.multiplier}</span>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-neutral-300">Importo (USDC)</span>
          <input
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="4.30"
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
          />
        </label>

        <label className="block">
          <span className="text-sm text-neutral-300">Merchant</span>
          <input
            value={merchantInput}
            onChange={(event) => setMerchantInput(event.target.value)}
            placeholder="0x…"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs outline-none focus:border-amber-500"
          />
          {merchantInput.trim() !== '' && !merchantValid && (
            <span className="mt-1 block text-xs text-red-400">Indirizzo non valido.</span>
          )}
        </label>

        <div className="rounded-lg bg-neutral-900 p-3 text-sm">
          {amount === undefined || saving === undefined || total === undefined ? (
            <p className="text-neutral-500">Inserisci un importo per l'anteprima.</p>
          ) : (
            <ul className="space-y-1 text-neutral-300">
              <li className="flex justify-between">
                <span>Merchant</span>
                <span>{formatUsdc(amount)} USDC</span>
              </li>
              <li className="flex justify-between">
                <span>Risparmio nel goal</span>
                <span className="text-amber-400">+{formatUsdc(saving)} USDC</span>
              </li>
              <li className="flex justify-between border-t border-neutral-800 pt-1 font-medium">
                <span>Addebito totale</span>
                <span>{formatUsdc(total)} USDC</span>
              </li>
            </ul>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          Saldo: {balance.data === undefined ? '…' : `${formatUsdc(balance.data)} USDC`}
        </p>

        {insufficient === true && <p className="text-xs text-red-400">Saldo USDC insufficiente per pagamento + risparmio.</p>}

        {needsApproval === true && (
          <button
            onClick={onApprove}
            disabled={!canApprove}
            className="w-full rounded-lg border border-amber-500 px-4 py-2 font-medium text-amber-400 disabled:opacity-40"
          >
            Approva USDC per il router
          </button>
        )}
        <TxStatus phase={approval.phase} hash={approval.hash} error={approval.error} />

        <button
          onClick={onPay}
          disabled={!canPay}
          className="w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-40"
        >
          Paga e risparmia
        </button>
        <TxStatus phase={payment.phase} hash={payment.hash} error={payment.error} />
      </div>
    </div>
  )
}
