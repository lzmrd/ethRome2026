import { useEffect, useState } from 'react'
import { isAddress, zeroAddress, type Address } from 'viem'
import { useConnection, useReadContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { factoryAbi, vaultAbi } from '../config/abis'
import { FACTORY, SNOWTRACE_ADDRESS, SNOWTRACE_TX } from '../config/addresses'
import { ENS_EXPLORER, FORMICA_REGISTRAR, FORMICA_ROOT, SEPOLIA_CHAIN_ID, ensRegistrarAbi } from '../config/ens'
import { ProgressBar } from '../components/ProgressBar'
import { TxStatus } from '../components/TxStatus'
import { useAaveApy } from '../hooks/useAaveApy'
import { useGoalTarget } from '../hooks/useEnsGoal'
import { useGoalBalance, useGoalMeta } from '../hooks/useGoals'
import { useVaultEvents } from '../hooks/useVaultEvents'
import { formatDate, formatUsdc, parseUsdc, shortAddress } from '../lib/format'
import { useTx } from '../lib/tx'

export function GoalDetail({ address, navigate }: { address: string; navigate: (path: string) => void }) {
  const connection = useConnection()
  const queryClient = useQueryClient()
  const apy = useAaveApy()

  const valid = isAddress(address)
  const vault = valid ? (address as Address) : undefined

  const isVault = useReadContract({
    address: FACTORY,
    abi: factoryAbi,
    functionName: 'isVault',
    args: vault ? [vault] : undefined,
    query: { enabled: Boolean(vault) },
  })
  const meta = useGoalMeta(vault)
  const { balance, shares } = useGoalBalance(vault, meta.owner)
  const events = useVaultEvents(vault ?? zeroAddress)

  const connected = connection.address
  const isOwner = Boolean(meta.owner && connected && meta.owner.toLowerCase() === connected.toLowerCase())

  const ensLabel = useReadContract({
    address: FORMICA_REGISTRAR,
    abi: ensRegistrarAbi,
    functionName: 'labelOf',
    args: connected ? [connected] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: Boolean(connected) },
  })
  const userLabel = ensLabel.data && ensLabel.data.length > 0 ? ensLabel.data : undefined
  const goalName = userLabel && meta.label ? `${meta.label}.${userLabel}.${FORMICA_ROOT}` : ''
  const target = useGoalTarget(goalName)
  const verifiedName =
    target.vault && vault && target.vault.toLowerCase() === vault.toLowerCase() ? goalName : undefined

  const [amountInput, setAmountInput] = useState('')
  const amount = parseUsdc(amountInput)
  const withdrawing = useTx()

  useEffect(() => {
    if (withdrawing.phase === 'success') {
      setAmountInput('')
      void queryClient.invalidateQueries()
    }
  }, [withdrawing.phase, queryClient])

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
  const overBalance = amount !== undefined && balance !== undefined ? amount > balance : undefined

  const noTxPending = !['simulating', 'signing', 'mining'].includes(withdrawing.phase)
  const canWithdraw =
    Boolean(connected && vault) && isOwner && amount !== undefined && amount > 0n && overBalance === false && noTxPending
  const canWithdrawMax =
    Boolean(connected && vault) && isOwner && shares !== undefined && shares > 0n && noTxPending

  async function onWithdrawMax() {
    if (!connected || !vault || shares === undefined || shares === 0n) return
    await withdrawing.run({
      account: connected,
      address: vault,
      abi: vaultAbi,
      functionName: 'redeem',
      args: [shares, connected, connected],
    })
  }

  async function onWithdraw() {
    if (!connected || !vault || amount === undefined) return
    await withdrawing.run({
      account: connected,
      address: vault,
      abi: vaultAbi,
      functionName: 'withdraw',
      args: [amount, connected, connected],
    })
  }

  if (!valid) {
    return (
      <div>
        <p className="text-red-400">Indirizzo vault non valido.</p>
        <button className="mt-2 text-sm underline" onClick={() => navigate('/')}>
          Torna alla dashboard
        </button>
      </div>
    )
  }

  return (
    <div>
      <button className="text-sm text-neutral-400 hover:text-white" onClick={() => navigate('/')}>
        ← Dashboard
      </button>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{meta.label ?? shortAddress(address)}</h1>
          <a
            className="text-xs text-neutral-500 underline decoration-dotted"
            href={`${SNOWTRACE_ADDRESS}${address}`}
            target="_blank"
            rel="noreferrer"
          >
            {address}
          </a>
          {verifiedName && (
            <a
              className="mt-1 block font-mono text-xs text-amber-400 underline decoration-dotted"
              href={`${ENS_EXPLORER}${verifiedName}`}
              target="_blank"
              rel="noreferrer"
            >
              {verifiedName}
            </a>
          )}
        </div>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
          {meta.mode === 1 ? 'Yield · Aave' : 'Liquid'} · x{meta.multiplier ?? '-'}
        </span>
      </div>

      {isVault.data === false && (
        <p className="mt-2 text-xs text-red-400">Attenzione: non risulta un vault registrato nella factory.</p>
      )}

      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-neutral-500">Saldo</p>
            <p className="text-3xl font-bold">{balance === undefined ? '…' : formatUsdc(balance)} USDC</p>
          </div>
          <div className="text-right text-xs text-neutral-400">
            <p>yield {earned === undefined ? '…' : `+${formatUsdc(earned, 4)} USDC`}</p>
            <p>versato netto {meta.netDeposited === undefined ? '…' : `${formatUsdc(meta.netDeposited)} USDC`}</p>
            {meta.mode === 1 && apy !== undefined && <p>Aave APY {apy.toFixed(2)}%</p>}
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={progress} />
          <p className="mt-1 text-xs text-neutral-500">
            {meta.target !== undefined && meta.target > 0n
              ? `target ${formatUsdc(meta.target)} USDC`
              : 'nessun target impostato'}
          </p>
        </div>
      </div>

      {isOwner ? (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-semibold">Preleva</h2>
          <div className="mt-2 flex gap-2">
            <input
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-amber-500"
            />
            <button
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
              onClick={() => balance !== undefined && setAmountInput(formatUsdc(balance, 6))}
            >
              Max
            </button>
          </div>
          {overBalance === true && <p className="mt-1 text-xs text-red-400">Importo oltre il saldo del goal.</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={onWithdraw}
              disabled={!canWithdraw}
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-40"
            >
              Preleva importo
            </button>
            <button
              onClick={onWithdrawMax}
              disabled={!canWithdrawMax}
              className="flex-1 rounded-lg border border-amber-500 px-4 py-2 font-medium text-amber-400 disabled:opacity-40"
            >
              Preleva tutto
            </button>
          </div>
          <TxStatus phase={withdrawing.phase} hash={withdrawing.hash} error={withdrawing.error} />
        </div>
      ) : (
        <p className="mt-6 text-xs text-neutral-500">Solo il proprietario ({meta.owner ? shortAddress(meta.owner) : '…'}) può prelevare.</p>
      )}

      <div className="mt-6">
        <h2 className="font-semibold">Storico</h2>
        {events.isLoading && <p className="mt-2 text-sm text-neutral-400">Lettura eventi…</p>}
        {events.data && events.data.length === 0 && (
          <p className="mt-2 text-sm text-neutral-500">Nessun movimento ancora.</p>
        )}
        <ul className="mt-2 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
          {(events.data ?? []).map((event) => (
            <li key={`${event.transactionHash}-${event.kind}-${event.blockNumber}`} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={event.kind === 'Deposit' ? 'text-emerald-400' : 'text-neutral-300'}>
                {event.kind === 'Deposit' ? 'Deposito' : 'Prelievo'} {formatUsdc(event.assets)} USDC
              </span>
              <span className="flex items-center gap-3 text-xs text-neutral-500">
                <span>blocco {event.blockNumber.toString()}</span>
                <a
                  className="underline decoration-dotted"
                  href={`${SNOWTRACE_TX}${event.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  tx
                </a>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-neutral-600">
          Ultimo aggiornamento {formatDate(events.dataUpdatedAt ? BigInt(Math.floor(events.dataUpdatedAt / 1000)) : undefined)}
        </p>
      </div>
    </div>
  )
}
