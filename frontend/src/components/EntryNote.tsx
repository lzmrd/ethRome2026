import { useState } from 'react'
import type { Address, Hex } from 'viem'
import { FUJI_CHAIN_ID } from '../config/addresses'
import type { useLedger } from '../hooks/useLedger'
import { findEntry } from '../lib/swarm/ledger'
import { Button, cx } from './ui'

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
          <button
            onClick={() => setEditing(true)}
            title="Edit this private note"
            className="group flex items-center gap-1.5 text-left text-xs text-ink-soft transition hover:text-ink"
          >
            <span aria-hidden className="text-ink-mute">🔒</span>
            <span className="truncate">
              {saved.merchant}
              {saved.category ? ` · ${saved.category}` : ''}
              {saved.note ? ` · ${saved.note}` : ''}
            </span>
            <span className="text-ink-mute opacity-0 transition group-hover:opacity-100">edit</span>
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            disabled={!ledger.canUpload}
            className={cx(
              'text-left text-xs text-ink-mute transition',
              ledger.canUpload
                ? 'underline decoration-dotted underline-offset-2 hover:text-ink-soft'
                : 'cursor-not-allowed',
            )}
          >
            {ledger.canUpload ? 'add context' : 'no context'}
          </button>
        )}
        {reference && (
          <p className="mt-1 truncate font-mono text-[10px] text-ink-mute" title={reference}>
            Swarm {reference}
          </p>
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
    <div className="mt-2 rounded-xl border border-line bg-canvas/50 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: merchant, set: setMerchant, placeholder: 'shop', wide: true },
          { value: category, set: setCategory, placeholder: 'category', wide: false },
          { value: note, set: setNote, placeholder: 'note', wide: true },
        ].map((field) => (
          <input
            key={field.placeholder}
            value={field.value}
            onChange={(e) => field.set(e.target.value)}
            placeholder={field.placeholder}
            autoFocus={field.placeholder === 'shop'}
            className={cx(
              'min-w-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs transition',
              'placeholder:text-ink-mute hover:border-line-strong focus:border-brand focus:outline-none',
              field.wide ? 'flex-1' : 'w-28',
            )}
          />
        ))}
        <Button size="sm" onClick={onSave} disabled={!merchant} busy={ledger.saving}>
          {ledger.saving ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          cancel
        </Button>
      </div>
      {ledger.error && <p className="mt-1.5 text-xs text-brand-soft">{ledger.error}</p>}
    </div>
  )
}
