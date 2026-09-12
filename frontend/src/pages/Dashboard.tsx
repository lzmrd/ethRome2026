import { useConnection, useWatchContractEvent } from 'wagmi'
import { factoryAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'
import { GoalCard } from '../components/GoalCard'
import { useAaveApy } from '../hooks/useAaveApy'
import { useUserGoals } from '../hooks/useGoals'

export function Dashboard({ navigate }: { navigate: (path: string) => void }) {
  const connection = useConnection()
  const owner = connection.address
  const goals = useUserGoals(owner)
  const apy = useAaveApy()

  useWatchContractEvent({
    address: FACTORY,
    abi: factoryAbi,
    eventName: 'GoalCreated',
    onLogs: () => {
      void goals.refetch()
    },
  })

  const vaults = goals.data ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Your goals</h1>
          <p className="text-sm text-neutral-400">
            {apy === undefined
              ? 'Aave V3: reading rate…'
              : `Aave V3 supply APY: ${apy.toFixed(2)}% (testnet, live)`}
          </p>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950"
        >
          New goal
        </button>
      </div>

      {goals.isLoading && <p className="mt-8 text-sm text-neutral-400">Loading goals…</p>}

      {!goals.isLoading && vaults.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-700 p-8 text-center">
          <p className="text-neutral-300">No goals yet.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Create your first one: each goal is a separate ERC-4626 vault.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {vaults.map((vault) => (
          <GoalCard key={vault} vault={vault} apy={apy} navigate={navigate} />
        ))}
      </div>
    </div>
  )
}
