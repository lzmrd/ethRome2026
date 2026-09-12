# Formica M4 — Libretto privato su Swarm: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ogni arrotondamento letto da Fuji può portare un contesto privato — negozio, categoria, nota — scritto su un feed Swarm cifrato con una chiave derivata dall'identità Swarm ID, e recuperabile da un altro browser.

**Architecture:** un solo feed sequenziale per identità, topic fisso. Ogni aggiornamento porta l'intero libretto JSON cifrato con `encryptionKey` derivata da `deriveAppSecret`. Firma e chiave sono deterministiche, quindi lo stesso account ritrova il proprio feed ovunque senza stato locale. Il manifest del feed va una volta sola nel text record `formica.ledger` del nome utente su Sepolia.

**Tech Stack:** `@snaha/swarm-id` 0.4.1 · React 19 · wagmi v3 · viem · TanStack Query · Tailwind · vitest (da aggiungere)

**Spec:** [`docs/superpowers/specs/2026-09-12-formica-m4-swarm-design.md`](../specs/2026-09-12-formica-m4-swarm-design.md)

## Global Constraints

- **Mai scrivere su Swarm un saldo o un importo ricavabile dalla catena.** Solo `tx`, `chainId`, `vault`, `merchant`, `category`, `note`, `receipt`. I numeri si leggono da Fuji, sempre.
- **Mai dichiarare come funzionante ciò che non è stato osservato.** Nessuna spunta in un documento senza una prova a schermo o on-chain.
- **Cut-off sab 12 set 21:00.** Se a quell'ora il caricamento reale non è provato, la feature si taglia: si rimuove la UI, non si dichiara, e il ramo resta nella storia di git.
- **Non indovinare l'API di `@snaha/swarm-id`.** I type stanno in `frontend/node_modules/@snaha/swarm-id/dist/types.d.ts` e `dist/swarm-id-client.d.ts`: leggerli prima di usare un metodo.
- **Usare `uploadRawPayload`/`downloadRawPayload` con `encryptionKey` nostra.** Mai `uploadPayload`, che genera una chiave casuale e la restituisce.
- Testo della UI in italiano, come il resto dell'app. Nessuna chiave privata stampata o committata.
- Gas: Sepolia usa fee normali. `useTx(SEPOLIA_CHAIN_ID)` lo gestisce già.
- Se Swarm è irraggiungibile o l'identità non è connessa, ogni pagina esistente deve restare identica a oggi.

## File Structure

| File | Responsabilità |
|---|---|
| `frontend/src/config/swarm.ts` (nuovo) | costanti: origine dell'iframe, topic, etichette dei segreti, chiave del record ENS |
| `frontend/src/lib/swarm/ledger.ts` (nuovo) | tipi del libretto e funzioni pure: `upsertEntry`, `encodeLedger`, `decodeLedger` |
| `frontend/src/lib/swarm/ledger.test.ts` (nuovo) | test delle funzioni pure |
| `frontend/src/lib/swarm/client.ts` (nuovo) | singleton `SwarmIdClient`, `initSwarm()`, `deriveLedgerKeys()` |
| `frontend/src/hooks/useSwarm.ts` (nuovo) | stato della connessione, `connect()`, `canUpload`, chiavi derivate |
| `frontend/src/hooks/useLedger.ts` (nuovo) | lettura e scrittura del libretto sul feed, via TanStack Query |
| `frontend/src/components/SwarmBar.tsx` (nuovo) | barra di stato Swarm + pulsante di connessione |
| `frontend/src/components/EntryNote.tsx` (nuovo) | contesto privato di una riga: mostra o modifica |
| `frontend/src/pages/GoalDetail.tsx` (modifica) | innesta `SwarmBar` e `EntryNote` nello storico |
| `frontend/src/pages/Names.tsx` (modifica) | pubblica il manifest del feed nel record `formica.ledger` |

---

### Task 1: Modello del libretto, puro e testato

**Files:**
- Create: `frontend/src/config/swarm.ts`
- Create: `frontend/src/lib/swarm/ledger.ts`
- Test: `frontend/src/lib/swarm/ledger.test.ts`
- Modify: `frontend/package.json` (aggiunge vitest e lo script `test`)

**Interfaces:**
- Produces: `type LedgerEntry`, `type Ledger`, `upsertEntry(ledger, entry): Ledger`, `encodeLedger(ledger): Uint8Array`, `decodeLedger(bytes): Ledger`, `EMPTY_LEDGER`, e da `config/swarm.ts`: `SWARM_IFRAME_ORIGIN`, `LEDGER_TOPIC`, `SIGNER_SECRET_LABEL`, `ENC_SECRET_LABEL`, `LEDGER_RECORD_KEY`.

- [ ] **Step 1: Installare vitest e dichiarare lo script**

```bash
cd frontend && pnpm add -D vitest
```

In `package.json`, dentro `"scripts"`, aggiungere: `"test": "vitest run"`.

- [ ] **Step 2: Scrivere il test che fallisce**

`frontend/src/lib/swarm/ledger.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EMPTY_LEDGER, decodeLedger, encodeLedger, upsertEntry } from './ledger'

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
})
```

- [ ] **Step 3: Verificare che fallisca**

Run: `cd frontend && pnpm test`
Expected: FAIL, il modulo `./ledger` non esiste.

- [ ] **Step 4: Scrivere le costanti**

`frontend/src/config/swarm.ts`:

```ts
import { keccak256, toBytes } from 'viem'

/** Dominio fidato che custodisce l'identità: l'app non vede mai la master key. */
export const SWARM_IFRAME_ORIGIN = 'https://swarm-id.snaha.net'

/** Topic del feed: 32 byte fissi, uguali per ogni utente. Il feed è distinto dal proprietario. */
export const LEDGER_TOPIC = keccak256(toBytes('formica-ledger-v1'))

/** Etichette dei segreti derivati. Cambiare una di queste rende illeggibili i libretti esistenti. */
export const SIGNER_SECRET_LABEL = 'formica-ledger-signer'
export const ENC_SECRET_LABEL = 'formica-ledger-enc'

/** Chiave del text record ENS che pubblica il manifest del feed. */
export const LEDGER_RECORD_KEY = 'formica.ledger'
```

- [ ] **Step 5: Scrivere il modello**

`frontend/src/lib/swarm/ledger.ts`:

```ts
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
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Ledger
    if (parsed?.v !== 1 || !Array.isArray(parsed.entries)) return EMPTY_LEDGER
    return parsed
  } catch {
    return EMPTY_LEDGER
  }
}
```

- [ ] **Step 6: Verificare che passi**

Run: `cd frontend && pnpm test`
Expected: PASS, 5 test.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/config/swarm.ts frontend/src/lib/swarm/ledger.ts frontend/src/lib/swarm/ledger.test.ts frontend/package.json frontend/pnpm-lock.yaml
git commit -m "frontend: private spend ledger model, keyed by Fuji tx hash"
```

---

### Task 2: Client Swarm e chiavi derivate

**Files:**
- Create: `frontend/src/lib/swarm/client.ts`
- Create: `frontend/src/hooks/useSwarm.ts`

**Interfaces:**
- Consumes: `SWARM_IFRAME_ORIGIN`, `SIGNER_SECRET_LABEL`, `ENC_SECRET_LABEL` (Task 1).
- Produces: `getSwarmClient(): Promise<SwarmIdClient>`, `deriveLedgerKeys(client): Promise<LedgerKeys>` con `type LedgerKeys = { signer: Hex; owner: Address; encryptionKey: Uint8Array }`, e l'hook `useSwarm(): { client, info, connect, connecting, canUpload, uploadIssue, keys }`.

- [ ] **Step 1: Scrivere il client**

`frontend/src/lib/swarm/client.ts`. Leggere prima `node_modules/@snaha/swarm-id/dist/swarm-id-client.d.ts`: `initialize()` va chiamata una volta sola e lancia se ripetuta, quindi il client è un singleton.

```ts
import { SwarmIdClient } from '@snaha/swarm-id'
import { toHex, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ENC_SECRET_LABEL, SIGNER_SECRET_LABEL, SWARM_IFRAME_ORIGIN } from '../../config/swarm'

export type LedgerKeys = {
  /** Chiave privata che firma gli aggiornamenti del feed. Non lasciarla uscire di qui. */
  signer: Hex
  /** Indirizzo del feed: ciò che serve a un lettore per trovarlo. */
  owner: Address
  encryptionKey: Uint8Array
}

let instance: SwarmIdClient | undefined
let ready: Promise<SwarmIdClient> | undefined

export function getSwarmClient(onChange?: () => void): Promise<SwarmIdClient> {
  if (ready) return ready
  instance = new SwarmIdClient({
    iframeOrigin: SWARM_IFRAME_ORIGIN,
    metadata: { name: 'Formica', description: 'Risparmia arrotondando le spese' },
    onConnectionChange: () => onChange?.(),
  })
  ready = instance.initialize().then(() => instance as SwarmIdClient)
  return ready
}

/**
 * Le chiavi nascono da `deriveAppSecret`, che è deterministico per account e
 * per origine: lo stesso account, su un altro browser, ottiene gli stessi byte
 * e quindi lo stesso feed. Non dipendono dal wallet Ethereum.
 */
export async function deriveLedgerKeys(client: SwarmIdClient): Promise<LedgerKeys> {
  const [signerSecret, encryptionKey] = await Promise.all([
    client.deriveAppSecret(SIGNER_SECRET_LABEL),
    client.deriveAppSecret(ENC_SECRET_LABEL),
  ])
  const signer = toHex(signerSecret)
  return { signer, owner: privateKeyToAccount(signer).address, encryptionKey }
}
```

- [ ] **Step 2: Scrivere l'hook**

`frontend/src/hooks/useSwarm.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import type { ConnectionInfo, SwarmIdClient } from '@snaha/swarm-id'
import { deriveLedgerKeys, getSwarmClient, type LedgerKeys } from '../lib/swarm/client'

/** Il callback di connessione arriva fuori da React: serve il client a portata di mano. */
let instanceRef: SwarmIdClient | undefined

export function useSwarm() {
  const [client, setClient] = useState<SwarmIdClient>()
  const [info, setInfo] = useState<ConnectionInfo>()
  const [keys, setKeys] = useState<LedgerKeys>()
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    let alive = true
    getSwarmClient(() => {
      if (alive && instanceRef) setInfo({ ...instanceRef.connectionInfo })
    })
      .then((c) => {
        if (!alive) return
        instanceRef = c
        setClient(c)
        setInfo({ ...c.connectionInfo })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  // Le chiavi si derivano solo a identità presente, e si azzerano se sparisce.
  useEffect(() => {
    if (!client || !info?.identity) {
      setKeys(undefined)
      return
    }
    let alive = true
    deriveLedgerKeys(client).then((k) => alive && setKeys(k)).catch(() => undefined)
    return () => {
      alive = false
    }
  }, [client, info?.identity?.id])

  const connect = useCallback(async () => {
    if (!client) return
    setConnecting(true)
    try {
      await client.connect()
    } finally {
      setConnecting(false)
    }
  }, [client])

  return {
    client,
    info,
    keys,
    connect,
    connecting,
    identity: info?.identity,
    canUpload: Boolean(info?.canUpload),
    uploadIssue: info?.uploadUnavailableReason,
  }
}
```

- [ ] **Step 3: Verificare che compili**

Run: `cd frontend && pnpm build`
Expected: nessun errore di TypeScript.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/swarm/client.ts frontend/src/hooks/useSwarm.ts
git commit -m "frontend: Swarm ID client with deterministic per-account ledger keys"
```

---

### Task 3: Lettura e scrittura del feed

**Files:**
- Create: `frontend/src/hooks/useLedger.ts`

**Interfaces:**
- Consumes: `LEDGER_TOPIC` (Task 1), `useSwarm`, `LedgerKeys` (Task 2), `Ledger`, `upsertEntry`, `encodeLedger`, `decodeLedger`, `EMPTY_LEDGER` (Task 1).
- Produces: `useLedger(): { ledger, isLoading, refresh, save, saving, error }` dove `save(entry: LedgerEntry): Promise<void>`.

- [ ] **Step 1: Scrivere l'hook**

`frontend/src/hooks/useLedger.ts`. Le firme esatte stanno in `dist/types.d.ts`: `makeSequentialFeedReader({ topic, owner })`, `makeSequentialFeedWriter({ topic, signer })`, `downloadRawPayload({ encryptionKey })` che ritorna `{ payload }`, `uploadRawPayload(data, { encryptionKey })`.

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LEDGER_TOPIC } from '../config/swarm'
import { EMPTY_LEDGER, decodeLedger, encodeLedger, upsertEntry, type Ledger, type LedgerEntry } from '../lib/swarm/ledger'
import { useSwarm } from './useSwarm'

export function useLedger() {
  const swarm = useSwarm()
  const queryClient = useQueryClient()
  const owner = swarm.keys?.owner

  const query = useQuery({
    queryKey: ['swarm-ledger', owner],
    enabled: Boolean(swarm.client && swarm.keys),
    queryFn: async (): Promise<Ledger> => {
      if (!swarm.client || !swarm.keys) return EMPTY_LEDGER
      const reader = swarm.client.makeSequentialFeedReader({ topic: LEDGER_TOPIC, owner: swarm.keys.owner })
      try {
        const { payload } = await reader.downloadRawPayload({ encryptionKey: swarm.keys.encryptionKey })
        return decodeLedger(payload)
      } catch {
        // Feed mai scritto: non è un errore, è un libretto vuoto.
        return EMPTY_LEDGER
      }
    },
  })

  const mutation = useMutation({
    mutationFn: async (entry: LedgerEntry) => {
      if (!swarm.client || !swarm.keys) throw new Error('Identità Swarm non connessa')
      if (!swarm.canUpload) throw new Error('Manca il francobollo postale: non posso scrivere su Swarm')
      const next = upsertEntry(query.data ?? EMPTY_LEDGER, entry)
      const writer = swarm.client.makeSequentialFeedWriter({ topic: LEDGER_TOPIC, signer: swarm.keys.signer })
      await writer.uploadRawPayload(encodeLedger(next), { encryptionKey: swarm.keys.encryptionKey })
      return next
    },
    onSuccess: (next) => queryClient.setQueryData(['swarm-ledger', owner], next),
  })

  return {
    ...swarm,
    ledger: query.data ?? EMPTY_LEDGER,
    isLoading: query.isLoading,
    /** Rilegge dal feed ignorando la copia in memoria: è la prova del recupero. */
    refresh: () => queryClient.invalidateQueries({ queryKey: ['swarm-ledger', owner] }),
    save: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error?.message,
  }
}
```

- [ ] **Step 2: Verificare che compili**

Run: `cd frontend && pnpm build`
Expected: nessun errore. Se un metodo del feed ha una firma diversa da quella qui sopra, **leggere i type e adeguarsi a quelli**, annotando lo scostamento nel report.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useLedger.ts
git commit -m "frontend: read and write the encrypted ledger on a Swarm feed"
```

---

### Task 4: La UI nello storico del goal

**Files:**
- Create: `frontend/src/components/SwarmBar.tsx`
- Create: `frontend/src/components/EntryNote.tsx`
- Modify: `frontend/src/pages/GoalDetail.tsx` (sezione "Storico", righe 215-243)

**Interfaces:**
- Consumes: `useLedger` (Task 3), `findEntry` (Task 1), `VaultEvent` da `hooks/useVaultEvents` (esistente: `{ kind, assets, transactionHash, blockNumber }`).

- [ ] **Step 1: La barra di stato**

`frontend/src/components/SwarmBar.tsx`. Deve dire la verità in ogni stato: identità assente, identità presente senza francobollo, tutto pronto.

```tsx
import { useLedger } from '../hooks/useLedger'

export function SwarmBar({ ledger }: { ledger: ReturnType<typeof useLedger> }) {
  const { identity, canUpload, uploadIssue, connect, connecting, refresh } = ledger

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
      <div>
        <p className="font-medium">Libretto privato</p>
        {!identity ? (
          <p className="text-xs text-neutral-500">Collega la tua identità Swarm per aggiungere il contesto delle spese.</p>
        ) : canUpload ? (
          <p className="text-xs text-neutral-500">Connesso come {identity.name}. Le note sono cifrate con la tua chiave.</p>
        ) : (
          <p className="text-xs text-amber-400">
            {uploadIssue === 'no-stamp'
              ? 'Manca il francobollo postale: puoi leggere, non scrivere.'
              : 'Caricamento non disponibile su questa identità.'}
          </p>
        )}
      </div>
      {identity ? (
        <button onClick={refresh} className="rounded-lg border border-neutral-700 px-3 py-1 text-xs">
          Rileggi da Swarm
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="rounded-lg border border-emerald-600 px-3 py-1 text-xs text-emerald-400 disabled:opacity-40"
        >
          {connecting ? 'Apro Swarm ID…' : 'Collega Swarm ID'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Il contesto di una riga**

`frontend/src/components/EntryNote.tsx`:

```tsx
import { useState } from 'react'
import type { Address, Hex } from 'viem'
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
  const [merchant, setMerchant] = useState(saved?.merchant ?? '')
  const [category, setCategory] = useState(saved?.category ?? '')
  const [note, setNote] = useState(saved?.note ?? '')

  if (!ledger.identity) return null

  if (!editing) {
    return saved ? (
      <button onClick={() => setEditing(true)} className="text-left text-xs text-neutral-400">
        {saved.merchant} · {saved.category}
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
    )
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="negozio"
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs" />
      <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="categoria"
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="nota"
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs" />
      <button
        disabled={ledger.saving || !merchant}
        onClick={async () => {
          await ledger.save({ tx, chainId: 43113, vault, merchant, category, note })
          setEditing(false)
        }}
        className="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-400 disabled:opacity-40"
      >
        {ledger.saving ? 'Salvo…' : 'Salva'}
      </button>
      <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs text-neutral-500">annulla</button>
    </div>
  )
}
```

- [ ] **Step 3: Innestarli nello storico**

In `GoalDetail.tsx`: importare `useLedger`, `SwarmBar`, `EntryNote`; chiamare `const ledger = useLedger()` accanto agli altri hook; inserire `<SwarmBar ledger={ledger} />` subito **prima** del blocco `<div className="mt-6">` che contiene "Storico"; dentro `<li>`, avvolgere il contenuto esistente in un `<div>` e aggiungere sotto `<EntryNote tx={event.transactionHash} vault={vault} ledger={ledger} />`. La riga `<li>` passa da `flex items-center justify-between` a `flex flex-col gap-1`, con la riga esistente in un `<div className="flex items-center justify-between">`.

- [ ] **Step 4: Verificare a schermo**

Run: `cd frontend && pnpm build && pnpm dev`
Expected: build pulita. Senza identità Swarm la pagina è identica a prima, con in più la barra che invita a collegarsi. Nessun errore in console.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SwarmBar.tsx frontend/src/components/EntryNote.tsx frontend/src/pages/GoalDetail.tsx
git commit -m "frontend: private context on each on-chain movement"
```

---

### Task 5: Pubblicare il feed nel nome ENS

**Files:**
- Modify: `frontend/src/pages/Names.tsx`

**Interfaces:**
- Consumes: `LEDGER_TOPIC`, `LEDGER_RECORD_KEY` (Task 1), `useLedger` (Task 3), `useTx(SEPOLIA_CHAIN_ID)` e il pattern di `setAddr` già presente nel file.

- [ ] **Step 1: Aggiungere il riquadro**

Nella pagina Nomi, sotto il namespace dell'utente, un riquadro "Libretto privato" visibile solo a identità Swarm connessa e namespace già reclamato. Un pulsante "Pubblica nel nome" che:

1. chiama `await client.createFeedManifest(LEDGER_TOPIC)` e ottiene il riferimento;
2. invia una transazione su Sepolia al **resolver dell'utente** (lo stesso indirizzo usato da `setAddr`, non il registry) con:

```ts
await publishTx.run({
  account,
  chainId: SEPOLIA_CHAIN_ID,
  address: ownedResolver,
  abi: [{
    type: 'function',
    name: 'setText',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  }] as const,
  functionName: 'setText',
  args: [userNode, LEDGER_RECORD_KEY, manifestRef],
})
```

`userNode` è il namehash di `<label>.formica.eth`, calcolato come già si fa nel file per il record `addr`. Il resolver supporta i text record: `supportsInterface(0x59d1d43c)` è `true`, verificato su Sepolia il 2026-09-12.

3. Dopo la conferma, mostra il valore riletto con `getEnsText` o una `readContract` di `text(node, key)`, così ciò che si vede è ciò che sta in catena e non ciò che abbiamo appena inviato.

- [ ] **Step 2: Verificare a schermo e in catena**

Run: `pnpm build`, poi dalla UI su Sepolia premere "Pubblica nel nome".
Expected: una transazione confermata; poi da terminale

```bash
~/.foundry/bin/cast call <resolver> 'text(bytes32,string)(string)' <userNode> 'formica.ledger' --rpc-url sepolia
```

deve restituire il riferimento del manifest.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Names.tsx
git commit -m "frontend: publish the ledger feed manifest in the formica.ledger record"
```

---

### Task 6: Documentare ciò che è stato osservato

**Files:**
- Create: `docs/e2e-m4.md`
- Modify: `README.md` (sezione Status)

- [ ] **Step 1: Scrivere la checklist, tutta da spuntare**

`docs/e2e-m4.md`, stessa forma di `docs/e2e-m2.md`: tabella con Passo, Atteso, Esito, Riferimento. Le righe sono i quattro punti del §9 della spec, più: identità non connessa (la pagina resta identica), `canUpload: false` (campi in sola lettura con motivo), feed vuoto al primo avvio. **Tutti gli esiti partono ⬜.**

- [ ] **Step 2: Aggiornare il README solo con ciò che è provato**

Nella sezione Status, una riga su M4 che descrive ciò che le spunte di `docs/e2e-m4.md` sostengono, e nient'altro. Se a fine lavoro il caricamento reale non è avvenuto, il README non nomina Swarm.

- [ ] **Step 3: Commit**

```bash
git add docs/e2e-m4.md README.md
git commit -m "docs: M4 checklist, nothing ticked yet"
```
