import { useEffect, useState } from 'react'
import { maxUint256 } from 'viem'
import { useConnection } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi, routerAbi } from '../config/abis'
import { ROUTER, USDC } from '../config/addresses'
import { TxStatus } from '../components/TxStatus'
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
      <h1 className="text-xl font-bold">Receive</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Pay in income: the recipient gets the net amount, the rounded difference goes into their goal.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-300">ENS name or goal address</span>
          <input
            value={vaultInput}
            onChange={(event) => setVaultInput(event.target.value)}
            placeholder="vacanza.mario.formica.eth"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs outline-none focus:border-amber-500"
          />
          {target.error && <span className="mt-1 block text-xs text-red-400">{target.error}</span>}
          {target.kind === 'name' && target.vault && (
            <span className="mt-1 block text-xs text-neutral-500">
              {target.name} → {shortAddress(target.vault)}
            </span>
          )}
          {meta.label !== undefined && meta.owner !== undefined && (
            <span className="mt-1 block text-xs text-neutral-500">
              goal "{meta.label}" by {shortAddress(meta.owner)} · x{meta.multiplier}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-neutral-300">Gross amount (USDC)</span>
          <input
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="104.30"
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
          />
        </label>

        <div className="rounded-lg bg-neutral-900 p-3 text-sm">
          {amount === undefined || saving === undefined || net === undefined ? (
            <p className="text-neutral-500">Enter an amount to see the preview.</p>
          ) : (
            <ul className="space-y-1 text-neutral-300">
              <li className="flex justify-between">
                <span>Recipient</span>
                <span>{formatUsdc(net)} USDC</span>
              </li>
              <li className="flex justify-between">
                <span>Saved into the goal</span>
                <span className="text-amber-400">+{formatUsdc(saving)} USDC</span>
              </li>
              <li className="flex justify-between border-t border-neutral-800 pt-1 font-medium">
                <span>Total charge</span>
                <span>{formatUsdc(amount)} USDC</span>
              </li>
            </ul>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          Your balance (payer): {balance.data === undefined ? '…' : `${formatUsdc(balance.data)} USDC`}
        </p>

        {insufficient === true && <p className="text-xs text-red-400">Not enough USDC balance.</p>}

        {needsApproval === true && (
          <button
            onClick={onApprove}
            disabled={!canApprove}
            className="w-full rounded-lg border border-amber-500 px-4 py-2 font-medium text-amber-400 disabled:opacity-40"
          >
            Approve USDC for the router
          </button>
        )}
        <TxStatus phase={approval.phase} hash={approval.hash} error={approval.error} />

        <button
          onClick={onSend}
          disabled={!canSend}
          className="w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-40"
        >
          Send income
        </button>
        <TxStatus phase={income.phase} hash={income.hash} error={income.error} />
      </div>
    </div>
  )
}
