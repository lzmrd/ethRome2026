import { useConnection, useDisconnect } from 'wagmi'
import type { Route } from '../lib/hashRoute'
import { shortAddress } from '../lib/format'
import { cx } from './ui'

const TABS: { label: string; path: string; route: Route['name'] }[] = [
  { label: 'Dashboard', path: '/', route: 'dashboard' },
  { label: 'Create goal', path: '/create', route: 'create' },
  { label: 'Spend', path: '/spend', route: 'spend' },
  { label: 'Receive', path: '/receive', route: 'receive' },
  { label: 'Names', path: '/names', route: 'names' },
]

export function Header({ current, navigate }: { current: Route['name']; navigate: (path: string) => void }) {
  const connection = useConnection()
  const disconnect = useDisconnect()

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-brand text-sm font-bold text-neutral-950">
            F
          </span>
          Formica
        </button>

        {/* Su schermi stretti la barra scorre invece di sparire. */}
        <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-current={current === tab.route ? 'page' : undefined}
              className={cx(
                'rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition duration-150 ease-soft',
                current === tab.route
                  ? 'bg-raised text-ink shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset]'
                  : 'text-ink-mute hover:bg-raised/60 hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {connection.isConnected && connection.address ? (
          <button
            onClick={() => disconnect.mutate()}
            title="Disconnect"
            className="group flex shrink-0 items-center gap-2 rounded-full border border-line bg-raised py-1 pr-3 pl-1.5 text-xs text-ink-soft transition duration-150 ease-soft hover:border-line-strong hover:text-ink"
          >
            <span className="size-2 rounded-full bg-good shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="tnum">{shortAddress(connection.address)}</span>
            <span className="text-ink-mute group-hover:text-ink">· sign out</span>
          </button>
        ) : (
          <span className="shrink-0 text-xs text-ink-mute">not connected</span>
        )}
      </div>
    </header>
  )
}
