import { useEffect, useState } from 'react'

export type Route =
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'spend' }
  | { name: 'receive' }
  | { name: 'goal'; address: string }

function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [head, param] = path.split('/')
  switch (head) {
    case 'create':
      return { name: 'create' }
    case 'spend':
      return { name: 'spend' }
    case 'receive':
      return { name: 'receive' }
    case 'goal':
      return param ? { name: 'goal', address: param } : { name: 'dashboard' }
    default:
      return { name: 'dashboard' }
  }
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    function onChange() {
      setRoute(parseHash(window.location.hash))
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  function navigate(path: string) {
    window.location.hash = path
  }

  return { route, navigate }
}
