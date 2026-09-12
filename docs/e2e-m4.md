# Formica — Checklist E2E M4 (libretto privato su Swarm)

Data: 2026-09-12 · Namespace: `mario.formica.eth` (resolver [`0x9FC28e21…FbCf3d`](https://sepolia.etherscan.io/address/0x9fc28e217716af2c37d6c2b2cbc34fa7e8fbcf3d)) · Wallet saver: `0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f` · Identità Swarm: `0xfede`

Le caselle si spuntano solo dopo aver osservato il passo, mai leggendo il codice.

| # | Passo | Atteso | Esito | Riferimento |
|---|---|---|---|---|
| 1 | Scrivo «bar testaccio · bar · ottimo caffè» su un movimento reale | l'app mostra il riferimento Swarm | ✅ la riga «Prelievo 1.8 USDC» del vault `0x099c…42f5` mostra il contesto e il riferimento `d4fa6296…cf6e37` | nessuna tx: il libretto è fuori catena |
| 2 | Scarico il feed da un gateway pubblico, fuori dall'app | byte illeggibili | ✅ `download.gateway.ethswarm.org/bzz/2c4445eb…` risolve il feed (index 0); con header `Swarm-Only-Root-Chunk: true` restituisce **4104 byte opachi**, nessuna stringa della nota (`strings` non trova `ottimo`/`testaccio`) | manifest `2c4445eb…`; feed owner `65b035…aa06`, topic `15c7c6…b5b3` |
| 3 | Apro un browser diverso, stessa identità Swarm, ricarico | la nota ricompare | ⬜ non ancora provato su un secondo browser (vedi nota sotto) | — |
| 4 | `formica.ledger` risolve dal nome e contiene il manifest | `text(node, "formica.ledger")` restituisce il riferimento | ✅ on-chain `2c4445ebbaca923016ef8b032a0851d4d8e9425f5ba95e8c33fc2c6a4da3fd2d`; il manifest scaricato dichiara `swarm-feed-owner`, `swarm-feed-topic`, `swarm-feed-type: Sequence` | setText [`0xd8d5784b…94dc46da`](https://sepolia.etherscan.io/tx/0xd8d5784b3c47a4b814f21f804d3822516f9f1068533d29df328f8c0294dc46da) (blocco 11689246) |
| 5 | Identità Swarm non connessa | la pagina è identica a prima, con la barra che invita | ✅ osservato a schermo: barra «Collega Swarm ID», nessun errore, numeri da Fuji intatti | screenshot del 2026-09-12 |
| 6 | `canUpload: false` (`no-stamp`) | campi in sola lettura, motivo per esteso | ⬜ non osservato: il drive Formica aveva un francobollo utilizzabile (`user-stamp`) | — |
| 7 | Feed vuoto al primo avvio | libretto vuoto, non un errore | ✅ osservato prima del primo salvataggio: nessun contesto, nessun errore in barra, il feed veniva letto come vuoto | screenshot del 2026-09-12 |

## Note oneste

- **Il punto 3 resta da fare.** `deriveAppSecret` è deterministico per account **e origine**: il secondo browser deve usare la stessa origine dell'app (`http://localhost:5173`) e la stessa identità Swarm ID. Un semplice reload della pagina, all'avvio, rilegge il libretto dal feed (non c'è cache locale del libretto, solo la cache in memoria di TanStack Query): è una prova parziale del recupero, non la prova cross-browser che chiede la spec.
- **Il corpo «in chiaro» del feed non si scarica**, non perché manchi il dato: il riferimento del payload è cifrato con la chiave derivata e senza chiave il gateway non lo segue (infatti `GET /feeds/…` risponde `200` con corpo vuoto). Il chunk radice del feed è invece pubblicamente leggibile e opaco: è la prova che il dato è su Swarm e che è cifrato.
- Il manifest viene creato **non cifrato** (`uploadOptions.encrypt: false`) di proposito: serve al gateway per seguire il feed. È il payload del libretto a essere cifrato, non il suo indice.
- Primo manifest pubblicato e poi sostituito: [`0xfbaf89f0…45ab797c`](https://sepolia.etherscan.io/tx/0xfbaf89f0c58f686fb5745fa3392b225cf2c80170e1e759632a91f84f45ab797c) conteneva un riferimento cifrato (128 hex) non risolvibile dai gateway; il corrente è `0xd8d5784b…94dc46da`.

## Come riprodurre la prova esterna

```bash
REF=$(~/.foundry/bin/cast call 0x9FC28e217716af2c37d6c2b2cbc34fa7e8fbcf3d 'text(bytes32,string)(string)' \
  $(~/.foundry/bin/cast namehash mario.formica.eth) 'formica.ledger' --rpc-url sepolia | tr -d '"')
# il manifest (in chiaro) e il feed (cifrato) dal gateway pubblico:
curl "https://download.gateway.ethswarm.org/bytes/$REF"
curl -H "Swarm-Only-Root-Chunk: true" \
  "https://download.gateway.ethswarm.org/feeds/65b03539d32383f802e487d705e015da8cd3aa06/15c7c6f182a364c29861b5fba1e10b593812ae105529386e43370a0b97e6b5b3"
```
