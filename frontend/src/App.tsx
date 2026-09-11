import { ChainGuard } from './components/ChainGuard'
import { Header } from './components/Header'
import { useHashRoute } from './lib/hashRoute'
import { Dashboard } from './pages/Dashboard'

export function App() {
  const { route, navigate } = useHashRoute()

  return (
    <div className="min-h-screen">
      <Header current={route.name} navigate={navigate} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ChainGuard>
          {route.name === 'dashboard' && <Dashboard navigate={navigate} />}
          {route.name !== 'dashboard' && (
            <p className="text-sm text-neutral-400">Pagina non ancora implementata.</p>
          )}
        </ChainGuard>
      </main>
    </div>
  )
}
