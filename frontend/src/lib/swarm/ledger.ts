import type { Address, Hex } from 'viem'

export type LedgerEntry = {
  /** Hash della transazione su Fuji: è la chiave che lega il privato al pubblico. */
  tx: Hex
  chainId: number
  vault: Address
  merchant: string
  category: string
  note: string
  /** Riferimento Swarm di una ricevuta, se caricata. */
  receipt?: string
}

export type Ledger = {
  v: 1
  updatedAt: number
  entries: LedgerEntry[]
}

export const EMPTY_LEDGER: Ledger = { v: 1, updatedAt: 0, entries: [] }

/**
 * Inserisce o sostituisce la voce di una transazione. Il libretto è piccolo e
 * viaggia intero a ogni aggiornamento del feed: niente delta, niente merge.
 */
export function upsertEntry(ledger: Ledger, entry: LedgerEntry): Ledger {
  const same = (a: Hex, b: Hex) => a.toLowerCase() === b.toLowerCase()
  const entries = ledger.entries.filter((e) => !same(e.tx, entry.tx))
  return { v: 1, updatedAt: Math.floor(Date.now() / 1000), entries: [entry, ...entries] }
}

export function findEntry(ledger: Ledger, tx: Hex): LedgerEntry | undefined {
  return ledger.entries.find((e) => e.tx.toLowerCase() === tx.toLowerCase())
}

export function encodeLedger(ledger: Ledger): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(ledger))
}

/**
 * Un libretto illeggibile non è un errore da mostrare: è un libretto che non
 * c'è ancora, o che è stato cifrato con un'altra identità.
 */
export function decodeLedger(bytes: Uint8Array): Ledger {
  return tryDecodeLedger(bytes) ?? EMPTY_LEDGER
}

/**
 * Come `decodeLedger`, ma dice anche *perché* non c'è un libretto: `undefined`
 * per byte vuoti o illeggibili, così la UI può distinguere un feed mai scritto
 * da una decifratura fallita.
 */
export function tryDecodeLedger(bytes: Uint8Array): Ledger | undefined {
  if (bytes.length === 0) return undefined
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Ledger
    if (parsed?.v !== 1 || !Array.isArray(parsed.entries)) return undefined
    return parsed
  } catch {
    return undefined
  }
}
