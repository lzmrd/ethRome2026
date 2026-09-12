import { useState } from 'react'
import { useConnection, useWatchContractEvent } from 'wagmi'
import { factoryAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'
import { GoalCard } from '../components/GoalCard'
import { Badge, Button, EmptyState, Skeleton } from '../components/ui'
import { useAaveApy } from '../hooks/useAaveApy'
import { useArchivedGoals } from '../hooks/useArchivedGoals'
import { useUserGoals } from '../hooks/useGoals'

export function Dashboard({ navigate }: { navigate: (path: string) => void }) {
  const connection = useConnection()
  const owner = connection.address
  const goals = useUserGoals(owner)
  const apy = useAaveApy()
  const archive = useArchivedGoals()
  const [showArchived, setShowArchived] = useState(false)

  useWatchContractEvent({
    address: FACTORY,
    abi: factoryAbi,
    eventName: 'GoalCreated',
    onLogs: () => {
      void goals.refetch()
    },
  })

  const vaults = goals.data ?? []
  const { visible, archived } = archive.partition(vaults)

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your goals</h1>
          <div className="mt-2">
            {apy === undefined ? (
              <Skeleton className="h-5 w-44" />
            ) : (
              <Badge tone="good">Aave V3 supply APY {apy.toFixed(2)}% · live on testnet</Badge>
            )}
          </div>
        </div>
        <Button onClick={() => navigate('/create')}>New goal</Button>
      </header>

      {goals.isLoading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      )}

      {!goals.isLoading && vaults.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No goals yet."
            action={<Button onClick={() => navigate('/create')}>Create your first goal</Button>}
          >
            Each goal is a separate ERC-4626 vault that you own, with its own round-up multiplier.
          </EmptyState>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {visible.map((vault) => (
          <GoalCard key={vault} vault={vault} apy={apy} navigate={navigate} />
        ))}
      </div>

      {archived.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchived((value) => !value)}
            className="text-xs text-ink-mute underline decoration-dotted underline-offset-4 transition hover:text-ink-soft"
          >
            {archived.length} archived {archived.length === 1 ? 'goal' : 'goals'} ·{' '}
            {showArchived ? 'hide' : 'show'}
          </button>
          {showArchived && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {archived.map((vault) => (
                <GoalCard key={vault} vault={vault} apy={apy} navigate={navigate} archived />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
