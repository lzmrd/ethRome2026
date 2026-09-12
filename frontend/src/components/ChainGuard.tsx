import type { ReactNode } from 'react'
import { useConnect, useConnection, useConnectors, useSwitchChain } from 'wagmi'
import { avalancheFuji } from 'wagmi/chains'
import { FUJI_CHAIN_ID } from '../config/addresses'
import { Button, Card } from './ui'

function Gate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </Card>
  )
}

export function ChainGuard({ children }: { children: ReactNode }) {
  const connection = useConnection()
  const connect = useConnect()
  const connectors = useConnectors()
  const { mutate: switchChain, isPending } = useSwitchChain()

  if (!connection.isConnected) {
    return (
      <Gate title="Connect a wallet">
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">
          Formica uses test USDC on Avalanche Fuji. Import the demo wallet in your browser.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              full
              busy={connect.isPending}
              onClick={() => connect.mutate({ connector })}
            >
              {connector.name}
            </Button>
          ))}
        </div>
        {connect.error && <p className="mt-3 text-sm text-bad">{connect.error.message}</p>}
      </Gate>
    )
  }

  if (connection.chainId !== FUJI_CHAIN_ID) {
    return (
      <Gate title="Wrong network">
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">
          You are on chain {connection.chainId}. Formica runs on Avalanche Fuji ({FUJI_CHAIN_ID}).
        </p>
        <Button
          full
          className="mt-5"
          busy={isPending}
          onClick={() => switchChain({ chainId: avalancheFuji.id })}
        >
          Switch to Fuji
        </Button>
      </Gate>
    )
  }

  return <>{children}</>
}
