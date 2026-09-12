import { describe, expect, it } from 'vitest'
import { EMPTY_LEDGER, decodeLedger, encodeLedger, tryDecodeLedger, upsertEntry } from './ledger'

const entry = {
  tx: '0xaa' as const,
  chainId: 43113,
  vault: '0x099c2Bc126E748241a77E186b342F8ABA1A642f5' as const,
  merchant: 'Bar Mario',
  category: 'colazione',
  note: 'con Anna',
}

describe('ledger', () => {
  it('aggiunge una voce nuova', () => {
    const next = upsertEntry(EMPTY_LEDGER, entry)
    expect(next.entries).toHaveLength(1)
    expect(next.entries[0].merchant).toBe('Bar Mario')
  })

  it('sostituisce la voce con lo stesso tx invece di duplicarla', () => {
    const once = upsertEntry(EMPTY_LEDGER, entry)
    const twice = upsertEntry(once, { ...entry, merchant: 'Bar Luigi' })
    expect(twice.entries).toHaveLength(1)
    expect(twice.entries[0].merchant).toBe('Bar Luigi')
  })

  it('confronta gli hash senza distinguere maiuscole', () => {
    const once = upsertEntry(EMPTY_LEDGER, entry)
    const twice = upsertEntry(once, { ...entry, tx: '0xAA', merchant: 'Bar Luigi' })
    expect(twice.entries).toHaveLength(1)
  })

  it('sopravvive a un giro di codifica e decodifica', () => {
    const ledger = upsertEntry(EMPTY_LEDGER, entry)
    expect(decodeLedger(encodeLedger(ledger))).toEqual(ledger)
  })

  it('tratta i byte illeggibili come libretto vuoto', () => {
    expect(decodeLedger(new Uint8Array([1, 2, 3]))).toEqual(EMPTY_LEDGER)
  })

  it('distingue un libretto illeggibile da uno vuoto', () => {
    expect(tryDecodeLedger(new Uint8Array([1, 2, 3]))).toBeUndefined()
    expect(tryDecodeLedger(new Uint8Array())).toBeUndefined()
    expect(tryDecodeLedger(encodeLedger(EMPTY_LEDGER))).toEqual(EMPTY_LEDGER)
  })
})
