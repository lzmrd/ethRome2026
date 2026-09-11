import { ChainGuard } from './components/ChainGuard'
import { Header } from './components/Header'
import { useHashRoute } from './lib/hashRoute'

export function App() {
  const { route, navigate } = useHashRoute()

  return (
    <div className="min-h-screen">
      <Header current={route.name} navigate={navigate} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ChainGuard>
          <p className="text-sm text-neutral-400">Dashboard in arrivo nel prossimo task.</p>
          {route.name === 'goal' && <p className="mt-2 text-xs text-neutral-500">goal {route.address}</p>}
        </ChainGuard>
      </main>
    </div>
  )
}
