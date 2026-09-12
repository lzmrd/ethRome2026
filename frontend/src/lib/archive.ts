import type { Address } from 'viem'

/**
 * I goal archiviati sono una preferenza di vista, non uno stato on-chain: il
 * registro della factory è append-only e l'etichetta di un vault è immutabile,
 * quindi togliere un goal dall'elenco è l'unico modo che l'utente ha di fare
 * ordine. Il vault resta suo, raggiungibile dal suo indirizzo.
 */

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

export function parseArchived(raw: string | null): string[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value
      .filter((item): item is string => typeof item === 'string' && ADDRESS_RE.test(item))
      .map((item) => item.toLowerCase())
  } catch {
    return []
  }
}

export function isArchived(list: readonly string[], vault: Address): boolean {
  return list.includes(vault.toLowerCase())
}

export function toggleArchived(list: readonly string[], vault: Address): string[] {
  const key = vault.toLowerCase()
  return list.includes(key) ? list.filter((item) => item !== key) : [...list, key]
}

/** Divide i goal mantenendo l'ordine della factory in entrambi i gruppi. */
export function partitionGoals<T extends Address>(
  vaults: readonly T[],
  list: readonly string[],
): { visible: T[]; archived: T[] } {
  const visible: T[] = []
  const archived: T[] = []
  for (const vault of vaults) {
    if (isArchived(list, vault)) archived.push(vault)
    else visible.push(vault)
  }
  return { visible, archived }
}
