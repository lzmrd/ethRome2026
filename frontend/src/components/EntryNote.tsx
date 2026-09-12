import { useState } from 'react'
import type { Address, Hex } from 'viem'
import { FUJI_CHAIN_ID } from '../config/addresses'
import type { useLedger } from '../hooks/useLedger'
import { findEntry } from '../lib/swarm/ledger'

export function EntryNote({
  tx,
  vault,
  ledger,
}: {
  tx: Hex
  vault: Address
  ledger: ReturnType<typeof useLedger>
}) {
  const saved = findEntry(ledger.ledger, tx)
  const [editing, setEditing] = useState(false)
  const [reference, setReference] = useState<string>()
  const [merchant, setMerchant] = useState(saved?.merchant ?? '')
  const [category, setCategory] = useState(saved?.category ?? '')
  const [note, setNote] = useState(saved?.note ?? '')

  if (!ledger.identity) return null

  if (!editing) {
    return (
      <div>
        {saved ? (
          <button onClick={() => setEditing(true)} className="text-left text-xs text-neutral-400">
            {saved.merchant}
            {saved.category ? ` · ${saved.category}` : ''}
            {saved.note ? ` · ${saved.note}` : ''}
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            disabled={!ledger.canUpload}
            className="text-left text-xs text-neutral-600 underline decoration-dotted disabled:no-underline"
          >
            {ledger.canUpload ? 'aggiungi contesto' : 'nessun contesto'}
          </button>
        )}
        {reference && (
          <p className="mt-0.5 break-all font-mono text-[10px] text-neutral-600">Swarm {reference}</p>
        )}
      </div>
    )
  }

  async function onSave() {
    if (!merchant) return
    try {
      const result = await ledger.save({ tx, chainId: FUJI_CHAIN_ID, vault, merchant, category, note })
      setReference(result.reference)
      setEditing(false)
    } catch {
      // L'errore resta visibile sotto i campi, preso da ledger.error.
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="negozio"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="categoria"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="nota"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs"
        />
        <button
          disabled={ledger.saving || !merchant}
          onClick={onSave}
          className="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-400 disabled:opacity-40"
        >
          {ledger.saving ? 'Salvo…' : 'Salva'}
        </button>
        <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs text-neutral-500">
          annulla
        </button>
      </div>
      {ledger.error && <p className="mt-1 text-xs text-amber-400">{ledger.error}</p>}
    </div>
  )
}
