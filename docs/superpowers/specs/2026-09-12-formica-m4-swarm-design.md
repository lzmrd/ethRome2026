# Formica M4 — Il libretto privato su Swarm

**Stato:** approvata a voce il 2026-09-12 · **Time-box:** 3 ore · **Cut-off: sab 12 set 21:00** — se a quell'ora il caricamento reale non è provato, la feature si taglia e non si dichiara da nessuna parte.

**Dipendenza esterna bloccante:** un postage batch finanziato (gift code del desk Swarm). Senza, l'SDK risponde `canUpload: false` / `uploadUnavailableReason: 'no-stamp'` e non si carica nulla.

## 1. Il problema

La catena registra **quanto** e **verso chi**: importo, indirizzo, blocco. Non registra **che cosa** hai comprato, e non deve — pubblicare la cronologia degli acquisti legata a un indirizzo è esattamente ciò che non si vuole. Oggi la pagina di dettaglio del goal sa dire solo «1,20 arrotondati da `0x1e6E…`».

Manca il significato: il negozio, la categoria, la nota, la ricevuta. È informazione che nessuna query on-chain potrà mai produrre, appartiene all'utente e deve restare cifrata.

## 2. Cosa va su Swarm, e cosa no

| Dato | Dove sta | Chi lo vede |
|---|---|---|
| saldo del vault, `netDeposited`, yield | Fuji | tutti |
| ogni arrotondamento: importo, controparte, blocco | Fuji (eventi) | tutti |
| **negozio, categoria, nota, ricevuta** | **Swarm, cifrato** | **solo l'utente** |

**Regola vincolante:** su Swarm non finisce mai un saldo né un importo ricavabile dalla catena. Duplicare dati pubblici renderebbe l'integrazione decorativa, e il bando Swarm giudica esplicitamente se «Swarm sta facendo lavoro vero nell'app invece di stare nel README». I numeri restano letti da Fuji in tempo reale, sempre.

## 3. Il payload

Un libretto per identità Swarm, non per goal. Ogni aggiornamento del feed porta **l'intero libretto**, non un delta: è di pochi kB e toglie ogni logica di merge.

```jsonc
{
  "v": 1,
  "updatedAt": 1757680000,
  "entries": [
    {
      "tx": "0x8f…",            // hash della tx su Fuji: l'aggancio al fatto pubblico
      "chainId": 43113,
      "vault": "0x099c…",       // quale goal
      "merchant": "Bar Mario",  // ciò che la catena non sa
      "category": "colazione",
      "note": "con Anna",
      "receipt": "<bzz ref>"    // facoltativo, vedi §8
    }
  ]
}
```

L'hash della transazione è la chiave di join: la riga pubblica su Fuji e la riga privata su Swarm descrivono lo stesso fatto, e l'app le mostra affiancate.

## 4. Chiavi e identità

Tutto deriva da `client.deriveAppSecret(label)`, che l'SDK 0.4.1 espone come `(label: string) => Promise<Uint8Array>`. Il segreto è deterministico per origine e per account: lo stesso account, sulla stessa app, da qualunque browser, ottiene gli stessi 32 byte. **Non dipende dal wallet Ethereum**, e questo è il motivo per cui il recupero da un altro browser funziona per costruzione.

| Cosa | Derivazione |
|---|---|
| chiave di firma del feed | `deriveAppSecret('formica-ledger-signer')` → chiave privata a 32 byte |
| indirizzo proprietario del feed | `privateKeyToAccount(signer).address` (viem), uguale su ogni dispositivo |
| chiave di cifratura | `deriveAppSecret('formica-ledger-enc')` → 32 byte passati a Swarm |

La cifratura è quella di Swarm, ma **con la nostra chiave**: `uploadRawPayload(data, { encryptionKey })` e `downloadRawPayload({ encryptionKey })` accettano entrambi una chiave a 32 byte fornita da noi (verificato nei type dell'SDK 0.4.1). Niente crittografia fatta in casa: meno codice e meno modi di sbagliare, e la chiave resta derivata dall'account, quindi nessun altro può decifrare. Attenzione a non usare `uploadPayload`, che genera una chiave casuale e la restituisce: sarebbe da conservare da qualche parte, e quel qualche parte non esiste.

## 5. Il feed e il nome

- Topic fisso: `formica-ledger-v1`.
- Scrittura: `makeSequentialFeedWriter({ topic, signer })` → `uploadPayload(bytes)`.
- Lettura: `makeSequentialFeedReader({ topic, owner })` → `downloadPayload()` sull'ultimo indice.

Il feed ha un indirizzo stabile: si scrive **una volta sola** su Sepolia e non si tocca più. `createFeedManifest(topic)` produce il riferimento, che va nel text record **`formica.ledger`** del nome dell'utente (`<utente>.formica.eth`). Il resolver del namespace supporta i text record — verificato on-chain il 2026-09-12: `supportsInterface(0x59d1d43c)` → `true` sul resolver `0x9FC28e21…FbCf3d`. Costo totale: **una transazione**, poi ogni nota è gratis e fuori catena.

**Onestà sul record ENS:** l'app, da sola, non ne ha bisogno — conosce già il proprietario del feed perché lo deriva dall'identità. Il record serve a rendere il libretto **trovabile a partire dal nome** da qualcosa che non sia la nostra app, e a dare un aggancio pubblico a chi un domani autorizzeremo via ACT (§8). Va detto così, non spacciato per necessario.

## 6. Superficie utente

1. **Dettaglio del goal** — ogni riga dello storico letta da Fuji guadagna, accanto all'importo, il suo contesto privato: se c'è, lo mostra; se non c'è, un campo per scriverlo. Salvare aggiorna il feed.
2. **Barra di stato Swarm** — l'identità connessa e `uploadMode`. Quando `canUpload` è `false` con `'no-stamp'`, il messaggio dice che manca il francobollo e il pulsante di salvataggio è disabilitato: mai un salvataggio che finge di essere riuscito.
3. **Prova del recupero** — un pulsante che ricarica il libretto dal feed ignorando lo stato in memoria, così la demo mostra il ritorno dei dati e non una variabile locale.

## 7. Modalità di errore

| Caso | Comportamento |
|---|---|
| identità non connessa | l'app funziona identica, senza la colonna privata; nessun errore in faccia |
| `canUpload: false` | campi in sola lettura, motivo mostrato per esteso |
| feed vuoto (primo avvio) | libretto vuoto, non un errore |
| decifratura fallita | «libretto non leggibile con questa identità»; mai un crash, mai testo spazzatura |
| Swarm irraggiungibile | la pagina resta usabile: i numeri vengono da Fuji e non dipendono da Swarm |

## 8. Fuori scope

- **Ricevute come file** (`uploadFile` + riferimento nell'entry): solo se avanza tempo dopo che il flusso principale è provato.
- **Condivisione via ACT** (`actUploadData` con grantee): non si fa. Resta la riga «dove lo porteremmo» che il bando Swarm chiede.
- **Totale aggregato su più wallet**: non si fa e non si dichiara. Poggia su un'assunzione non verificata — i docs non dicono che si possa agganciare un secondo wallet Ethereum a un account esistente — e in demo costerebbe due wallet e due namespace. Resta anch'essa nella riga «dove lo porteremmo».

## 9. Come si verifica

Nessun passo è verde finché non è osservato, e la prova del punto 3 è quella che conta per il bando.

1. Scrivo «Bar Mario · colazione» su un arrotondamento reale; l'app mostra il riferimento Swarm.
2. Scarico quel riferimento **da un gateway pubblico, fuori dall'app**: escono byte illeggibili. Prova insieme che il dato è davvero su Swarm e che è davvero cifrato.
3. Apro un browser diverso, entro con la stessa identità Swarm, ricarico: la nota ricompare. Nel repo non esiste un backend che possa averla conservata.
4. `formica.ledger` risolve dal nome e contiene il manifest del feed.

## 10. Cosa dichiariamo

Solo ciò che il §9 ha mostrato. In particolare **non** diremo mai che gli importi sono privati: sono pubblici su Fuji, e il video lo dirà esplicitamente. Quello che è privato, e che è il punto, è il loro significato.
