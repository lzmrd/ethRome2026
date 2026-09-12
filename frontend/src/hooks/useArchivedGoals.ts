import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { Address } from 'viem'
import { isArchived, parseArchived, partitionGoals, toggleArchived } from '../lib/archive'

const KEY = 'formica.archived-goals'
const listeners = new Set<() => void>()

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? '[]'
  } catch {
    // Finestra anonima o storage negato: l'archivio vive solo in memoria.
    return '[]'
  }
}

let snapshot = readRaw()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function write(next: string[]) {
  snapshot = JSON.stringify(next)
  try {
    localStorage.setItem(KEY, snapshot)
  } catch {
    // Vedi sopra: senza storage la scelta vale per questa sessione.
  }
  for (const listener of listeners) listener()
}

/** Un'unica sorgente per Dashboard, Spend e dettaglio: archiviare in una si vede nelle altre. */
export function useArchivedGoals() {
  const raw = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => '[]',
  )
  const list = useMemo(() => parseArchived(raw), [raw])

  return {
    count: list.length,
    isArchived: useCallback((vault: Address) => isArchived(list, vault), [list]),
    toggle: useCallback((vault: Address) => write(toggleArchived(list, vault)), [list]),
    partition: useCallback(
      <T extends Address>(vaults: readonly T[]) => partitionGoals(vaults, list),
      [list],
    ),
  }
}
