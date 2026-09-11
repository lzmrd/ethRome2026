import type { ReactNode } from 'react'
import { useConnect, useConnection, useConnectors, useSwitchChain } from 'wagmi'
import { avalancheFuji } from 'wagmi/chains'
import { FUJI_CHAIN_ID } from '../config/addresses'

export function ChainGuard({ children }: { children: ReactNode }) {
  const connection = useConnection()
  const connect = useConnect()
  const connectors = useConnectors()
  const { mutate: switchChain, isPending } = useSwitchChain()

  if (!connection.isConnected) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <h2 className="text-lg font-semibold">Connetti un wallet</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Formica usa USDC di test su Avalanche Fuji. Importa la wallet demo nel browser.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-50"
              disabled={connect.isPending}
              onClick={() => connect.mutate({ connector })}
            >
              {connector.name}
            </button>
          ))}
        </div>
        {connect.error && <p className="mt-3 text-sm text-red-400">{connect.error.message}</p>}
      </div>
    )
  }

  if (connection.chainId !== FUJI_CHAIN_ID) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <h2 className="text-lg font-semibold">Rete sbagliata</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Sei sulla chain {connection.chainId}. Formica usa Avalanche Fuji ({FUJI_CHAIN_ID}).
        </p>
        <button
          className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-50"
          disabled={isPending}
          onClick={() => switchChain({ chainId: avalancheFuji.id })}
        >
          Passa a Fuji
        </button>
      </div>
    )
  }

  return <>{children}</>
}
