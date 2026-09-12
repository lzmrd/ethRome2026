import { useEffect, useState } from 'react'
import { isAddress, zeroAddress, type Address } from 'viem'
import { useConnection, useReadContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { factoryAbi, vaultAbi } from '../config/abis'
import { FACTORY, SNOWTRACE_ADDRESS, SNOWTRACE_TX } from '../config/addresses'
import { ENS_EXPLORER, FORMICA_REGISTRAR, FORMICA_ROOT, SEPOLIA_CHAIN_ID, ensRegistrarAbi } from '../config/ens'
import { ProgressBar } from '../components/ProgressBar'
import { SwarmBar } from '../components/SwarmBar'
import { Badge, Button, Card, EmptyState, SectionTitle, Skeleton, TextInput, cx } from '../components/ui'
import { EntryNote } from '../components/EntryNote'
import { TxStatus } from '../components/TxStatus'
import { useAaveApy } from '../hooks/useAaveApy'
import { useGoalTarget } from '../hooks/useEnsGoal'
import { useGoalBalance, useGoalMeta } from '../hooks/useGoals'
import { useLedger } from '../hooks/useLedger'
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
  const ledger = useLedger()

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
      <EmptyState
        title="Invalid vault address."
        action={<Button variant="secondary" onClick={() => navigate('/')}>Back to dashboard</Button>}
      />
    )
  }

  return (
    <div>
      <button
        className="text-sm text-ink-mute transition hover:text-ink"
        onClick={() => navigate('/')}
      >
        ← Dashboard
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{meta.label ?? shortAddress(address)}</h1>
          <a
            className="tnum mt-1 block truncate text-xs text-ink-mute underline decoration-dotted underline-offset-2 hover:text-ink-soft"
            href={`${SNOWTRACE_ADDRESS}${address}`}
            target="_blank"
            rel="noreferrer"
          >
            {address}
          </a>
          {verifiedName && (
            <a
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-mono text-xs text-brand-soft transition hover:bg-brand/20"
              href={`${ENS_EXPLORER}${verifiedName}`}
              target="_blank"
              rel="noreferrer"
            >
              {verifiedName}
            </a>
          )}
        </div>
        <Badge tone={meta.mode === 1 ? 'brand' : 'neutral'}>
          {meta.mode === 1 ? 'Yield · Aave' : 'Liquid'} · x{meta.multiplier ?? '–'}
        </Badge>
      </div>

      {isVault.data === false && (
        <p className="mt-3 rounded-xl border border-bad/30 bg-bad/5 px-3 py-2 text-xs text-bad">
          Warning: not a vault registered in the factory.
        </p>
      )}

      <Card className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-wide text-ink-mute uppercase">Balance</p>
            <p className="tnum mt-1 text-4xl font-bold tracking-tight">
              {balance === undefined ? (
                <Skeleton className="h-9 w-40" />
              ) : (
                <>
                  {formatUsdc(balance)} <span className="text-lg font-medium text-ink-mute">USDC</span>
                </>
              )}
            </p>
          </div>
          <div className="tnum space-y-0.5 text-right text-xs text-ink-soft">
            <p>yield {earned === undefined ? '…' : `+${formatUsdc(earned, 4)} USDC`}</p>
            <p>
              net deposited{' '}
              {meta.netDeposited === undefined ? '…' : `${formatUsdc(meta.netDeposited)} USDC`}
            </p>
            {meta.mode === 1 && apy !== undefined && <p>Aave APY {apy.toFixed(2)}%</p>}
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={progress} />
          <p className="tnum mt-1.5 text-xs text-ink-mute">
            {meta.target !== undefined && meta.target > 0n
              ? `target ${formatUsdc(meta.target)} USDC`
              : 'no target set'}
          </p>
        </div>
      </Card>

      {isOwner ? (
        <Card className="mt-4">
          <SectionTitle>Withdraw</SectionTitle>
          <div className="flex gap-2">
            <TextInput
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="flex-1 tnum"
            />
            <Button
              variant="secondary"
              onClick={() => balance !== undefined && setAmountInput(formatUsdc(balance, 6))}
            >
              Max
            </Button>
          </div>
          {overBalance === true && <p className="mt-1.5 text-xs text-bad">Amount above the goal balance.</p>}
          <div className="mt-3 flex gap-2">
            <Button
              full
              onClick={onWithdraw}
              disabled={!canWithdraw}
              busy={['simulating', 'signing', 'mining'].includes(withdrawing.phase)}
            >
              Withdraw amount
            </Button>
            <Button variant="secondary" full onClick={onWithdrawMax} disabled={!canWithdrawMax}>
              Withdraw all
            </Button>
          </div>
          <TxStatus phase={withdrawing.phase} hash={withdrawing.hash} error={withdrawing.error} />
        </Card>
      ) : (
        <p className="mt-4 text-xs text-ink-mute">
          Only the owner ({meta.owner ? shortAddress(meta.owner) : '…'}) can withdraw.
        </p>
      )}

      <SwarmBar ledger={ledger} />

      <section className="mt-6">
        <SectionTitle
          hint={`Last update ${formatDate(events.dataUpdatedAt ? BigInt(Math.floor(events.dataUpdatedAt / 1000)) : undefined)}`}
        >
          History
        </SectionTitle>

        {events.isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}

        {events.data && events.data.length === 0 && (
          <EmptyState title="No movements yet.">
            Spend or receive with this goal selected and the round-up shows up here.
          </EmptyState>
        )}

        {(events.data ?? []).length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/80">
            {(events.data ?? []).map((event) => (
              <li
                key={`${event.transactionHash}-${event.kind}-${event.blockNumber}`}
                className="flex flex-col gap-1 px-4 py-3 transition duration-150 ease-soft hover:bg-raised/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className={cx(
                        'size-1.5 rounded-full',
                        event.kind === 'Deposit' ? 'bg-good' : 'bg-ink-mute',
                      )}
                    />
                    <span className={cx('tnum', event.kind === 'Deposit' ? 'text-good' : 'text-ink-soft')}>
                      {event.kind === 'Deposit' ? 'Deposit' : 'Withdrawal'} {formatUsdc(event.assets)} USDC
                    </span>
                  </span>
                  <span className="tnum flex shrink-0 items-center gap-3 text-xs text-ink-mute">
                    <span>block {event.blockNumber.toString()}</span>
                    <a
                      className="underline decoration-dotted underline-offset-2 hover:text-ink-soft"
                      href={`${SNOWTRACE_TX}${event.transactionHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      tx
                    </a>
                  </span>
                </div>
                {vault && <EntryNote tx={event.transactionHash} vault={vault} ledger={ledger} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
