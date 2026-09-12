import { ChainGuard } from './components/ChainGuard'
import { Header } from './components/Header'
import { useHashRoute } from './lib/hashRoute'
import { CreateGoal } from './pages/CreateGoal'
import { Dashboard } from './pages/Dashboard'
import { GoalDetail } from './pages/GoalDetail'
import { Names } from './pages/Names'
import { Receive } from './pages/Receive'
import { Spend } from './pages/Spend'

export function App() {
  const { route, navigate } = useHashRoute()

  return (
    <div className="min-h-screen">
      <Header current={route.name} navigate={navigate} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ChainGuard>
          {route.name === 'dashboard' && <Dashboard navigate={navigate} />}
          {route.name === 'create' && <CreateGoal navigate={navigate} />}
          {route.name === 'spend' && <Spend />}
          {route.name === 'receive' && <Receive />}
          {route.name === 'goal' && <GoalDetail address={route.address} navigate={navigate} />}
        </ChainGuard>
        {route.name === 'names' && <Names />}
      </main>
    </div>
  )
}
