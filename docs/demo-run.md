# Formica — la sequenza di clic della demo

Il *cosa dire* sta in [demo-script.md](demo-script.md); qui c'è solo **cosa toccare**, in ordine.
Tutto avviene nel **Browser A** tranne dove è scritto altrimenti.

## Le tre finestre

```
┌─ BROWSER A ────────────────┐  ┌─ BROWSER B ───────────┐  ┌─ TERMINALE ──────────┐
│ localhost:5173             │  │ localhost:5173        │  │ curl già digitato,   │
│ MetaMask: saver + merchant │  │ wallet qualunque/Fuji │  │ NON eseguito         │
│ Swarm ID 0xfede connessa   │  │ Swarm ID 0xfede       │  │                      │
│ → qui si fa tutto          │  │ fermo sul goal        │  │                      │
└────────────────────────────┘  └───────────────────────┘  └──────────────────────┘
```

Il cambio di **rete** si fa dai pulsanti dentro l'app (`Switch to Sepolia`, `Switch to Fuji`):
in MetaMask approvi e basta. L'unica cosa che cambi a mano in MetaMask è l'**account**.

Tieni pronto in un tab o nei preferiti l'indirizzo del goal, perché la Dashboard del merchant è vuota:

```
http://localhost:5173/#/goal/0x1618094A5fC624061a1112ef3ec262fdCBB73CAc
```

## Il flusso

```
 REC ON
   │
 0:00  Dashboard (saver · Fuji) ─── nessun clic, solo parlato
   │   a schermo: summer-holiday 2,8/20 · new-laptop 1,0/3000
   ▼
 0:15  tab Spend
   │   goal = summer-holiday (già selezionato, verifica)
   │   Amount = 4.30
   │   guarda il diagramma: Merchant 4.30 │ goal +2.80 │ one transaction on Fuji
   │   [Pay and save] → MetaMask [Confirm] → attendi la conferma        (firma 1/3)
   ▼
 0:40  tab Dashboard → clic sulla card summer-holiday
   │   mostra il saldo salito e il badge Yield · Aave
   ▼
 0:52  MetaMask: cambia account → MERCHANT
   │   tab Names → [Switch to Sepolia] → MetaMask approva
   │   campo label = luigi
   │   [Claim your namespace] → MetaMask [Confirm] → attendi           (firma 2/3)
   │   ⚠️ UNA VOLTA SOLA: il secondo tentativo dà AlreadyClaimed()
   ▼
 1:17  vai all'URL del goal (tab/bookmark)
   │   la pagina chiede Fuji → [Switch to Fuji] → MetaMask approva
   │   mostra il link summer-holiday.mario.formica.eth
   ▼
 1:30  tab Receive
   │   nome = summer-holiday.mario.formica.eth → attendi «resolving…»
   │   poi la riga verde → 0x1618…3CAc
   │   Gross amount = 2.40 → diagramma: Recipient 0.80 │ goal +1.60
   │   [Send income] → MetaMask [Confirm] → attendi                    (firma 3/3)
   ▼
 1:47  torna all'URL del goal → riga nuova in History → [add context]
   │   bar testaccio │ bar │ great coffee → [Save]
   │   (scrittura su Swarm: nessuna firma, aspetta che il campo si chiuda)
   ▼
 2:15  ══► BROWSER B: ricarica la pagina (F5)
   │      compaiono la riga del movimento e la nota col lucchetto
   │      inquadra il badge con il nome dell'identità nella barra Private ledger
   ▼
 2:25  ══► TERMINALE: Invio sul curl già digitato
   │      byte opachi (≈4104), nessuna parola della nota
   ▼
 2:40  ══► torna sul Browser A (Dashboard o goal) — chiusura a voce
   │
 REC OFF
```

## Conto delle firme

| # | Quando | Rete | Account | Cosa |
|---|---|---|---|---|
| 1 | 0:15 | Fuji | saver | `payWithRoundUp` |
| – | 0:52 | – | – | cambio account (nessuna firma) |
| – | 0:52 | Sepolia | merchant | approvazione del cambio rete |
| 2 | 0:52 | Sepolia | merchant | `claim()` — **irripetibile** |
| – | 1:17 | Fuji | merchant | approvazione del cambio rete |
| 3 | 1:30 | Fuji | merchant | `receiveWithRoundDown` |
| – | 1:47 | – | – | nota su Swarm (nessuna firma) |

Le approvazioni USDC al router devono essere **già date da entrambi gli account** prima di REC,
altrimenti ogni pagamento chiede due firme e sfori i tre minuti.

## Se qualcosa va storto in diretta

- **Transazione lenta**: non commentare l'attesa, passa alla frase successiva e torna sullo schermo quando è confermata.
- **`claim()` bruciato in prova**: wallet di riserva in [demo-script.md](demo-script.md#-il-claim-si-può-fare-una-volta-sola).
- **Browser B non mostra la nota**: controlla di essere su `5173` e che la barra mostri il nome dell'identità; il pulsante `Reload from Swarm` rilegge solo il libretto.
- **`curl` che non risponde**: dillo e vai avanti — la prova è registrata in [e2e-m4.md](e2e-m4.md).
