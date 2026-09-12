# Formica — Checklist E2E M4 (libretto privato su Swarm)

Data: 2026-09-12 · Namespace: `mario.formica.eth` ([`0x9FC28e21…FbCf3d`](https://sepolia.etherscan.io/address/0x9fc28e217716af2c37d6c2b2cbc34fa7e8fbcf3d) resolver) · Wallet saver: `0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f`

**Stato: codice completo, caricamento reale mai osservato.** Il blocco è il postage batch: senza francobollo (o gateway sovvenzionato) `canUpload` è `false` e i punti 1–3 della spec non sono verificabili. Le caselle si spuntano solo dopo aver osservato il passo, mai leggendo il codice: **nessuna riga è spuntata**, e finché il punto 1 resta vuoto M4 non si dichiara da nessuna parte.

| # | Passo | Atteso | Esito | Riferimento |
|---|---|---|---|---|
| 1 | Scrivo «Bar Mario · colazione» su un arrotondamento reale | l'app mostra il riferimento Swarm | ⬜ bloccato: manca il francobollo | — |
| 2 | Scarico quel riferimento da un gateway pubblico, fuori dall'app | escono byte illeggibili (dato su Swarm e cifrato) | ⬜ | — |
| 3 | Apro un browser diverso con la stessa identità Swarm, ricarico | la nota ricompare | ⬜ (stessa origine della dApp: `deriveAppSecret` è per origine) | — |
| 4 | `formica.ledger` contiene il manifest del feed | `text(node, "formica.ledger")` restituisce il riferimento | ⬜ record non pubblicato; la `setText` è **simulata** con successo dal wallet su Sepolia, autorizzazione OK | simulazione `cast call` — nessuna tx |
| 5 | Identità Swarm non connessa | la pagina è identica a prima, con la barra che invita a collegarsi | ⬜ da osservare a schermo | — |
| 6 | `canUpload: false` (`no-stamp`) | campi in sola lettura, motivo per esteso, nessun salvataggio finto | ⬜ richiede identità connessa senza batch | — |
| 7 | Feed vuoto al primo avvio | libretto vuoto, non un errore | ⬜ | — |

## Cosa è già provato (senza identità né francobollo)

- `pnpm test`: 6/6 sul modello del libretto (upsert per hash tx, codifica/decodifica, byte illeggibili).
- `pnpm build` e `pnpm lint` verdi.
- API SDK verificate nei type di `@snaha/swarm-id` 0.4.1: `deriveAppSecret`, feed sequenziali, `uploadRawPayload`/`downloadRawPayload` con `encryptionKey` nostra, `createFeedManifest`.
- `supportsInterface(0x59d1d43c)` = `true` sul resolver dell'utente, che ha `ALL_ROLES`: la `setText` del punto 4 passerebbe.
- Il manifest viene creato con `createFeedManifest(LEDGER_TOPIC, { owner })`: l'owner esplicito è necessario perché il feed è firmato dal signer derivato, non dall'app signer.

## Come sbloccare

1. Ottenere un postage batch dall'identity UI di Swarm ID (gift code del desk Swarm a Urbe Hub), oppure passare un `subsidisedGatewayUrl` al client.
2. Con `canUpload: true`, rifare i punti 1–4 dal browser e spuntare solo quelli osservati.
