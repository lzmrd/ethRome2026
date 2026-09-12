import { useConnection, useDisconnect } from 'wagmi'
import type { Route } from '../lib/hashRoute'
import { shortAddress } from '../lib/format'

const TABS: { label: string; path: string; route: Route['name'] }[] = [
  { label: 'Dashboard', path: '/', route: 'dashboard' },
  { label: 'Crea goal', path: '/create', route: 'create' },
  { label: 'Spendi', path: '/spend', route: 'spend' },
  { label: 'Incassa', path: '/receive', route: 'receive' },
  { label: 'Nomi', path: '/names', route: 'names' },
]

export function Header({ current, navigate }: { current: Route['name']; navigate: (path: string) => void }) {
  const connection = useConnection()
  const disconnect = useDisconnect()

  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <button className="text-lg font-bold" onClick={() => navigate('/')}>
          Formica
        </button>
        <nav className="hidden gap-1 sm:flex">
          {TABS.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                current === tab.route ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="text-sm text-neutral-400">
          {connection.isConnected && connection.address ? (
            <button onClick={() => disconnect.mutate()} className="hover:text-white">
              {shortAddress(connection.address)} · esci
            </button>
          ) : (
            'non connesso'
          )}
        </div>
      </div>
    </header>
  )
}
