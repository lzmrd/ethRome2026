# Formica — copione della demo (≤ 3 minuti)

Il video deve aprirsi **senza login**. Parlato in inglese, come la UI. I numeri qui sotto sono letti dai contratti il 2026-09-12: se a schermo ne compaiono altri, **vince lo schermo** — leggi quello che vedi, non quello che c'è scritto qui.

## ⚠️ Il claim si può fare una volta sola

`claim()` rifiuta il secondo tentativo dello stesso indirizzo con `AlreadyClaimed()`. Il wallet merchant ha **un solo colpo**: prova pure tutto il resto quante volte vuoi, ma **quel pulsante premilo solo nella ripresa buona**. Se lo bruci in una prova, serve un terzo indirizzo con ETH su Sepolia.

## Prima di premere REC

- [ ] Dev server **solo** su `http://localhost:5173`. Se la 5174 è ancora accesa, spegnila: il libretto Swarm è legato all'origine e dalla 5174 risulterebbe vuoto.
- [ ] Browser A: app sulla Dashboard, wallet **saver** `0x6567…CB5f`, rete **Fuji**, identità Swarm `0xfede` connessa.
- [ ] Browser B: stessa app su `localhost:5173`, **già connesso** alla stessa identità Swarm, fermo sul dettaglio di `vacanza-indonesia`. Serve solo da ricaricare in diretta.
- [ ] Terminale con il `curl` del minuto 2:15 già digitato, **non eseguito**.
- [ ] MetaMask con entrambi gli account e **approvazione USDC già data** al router, altrimenti ogni pagamento chiede due firme.
- [ ] Nessun `.env`, nessuna chiave, nessun terminale con segreti a schermo.
- [ ] Saldi di partenza: saver 14,6 USDC su Fuji e 0,0035 ETH su Sepolia · merchant 2,9 USDC su Fuji e **0,003 ETH su Sepolia** · goal `vacanza-indonesia` 2,8 USDC su 20 di target.

## 0:00 – 0:12 · Il problema

> "Saving loses to spending because it asks you to choose. Formica removes the choice: round up what you spend, and the change lands in a savings goal — an ERC-4626 vault earning yield on Aave, with its own ENS name."

**A schermo:** la Dashboard con i goal e i saldi.

## 0:12 – 0:52 · L'arrotondamento, in diretta

**Fai:** Spend → goal `vacanza-indonesia` → importo **4.30** → conferma.

> "I'm paying 4.30. My goal multiplies the change by four, and the app quotes it before I sign: the merchant gets 4.30, 2.80 goes into the goal. That number comes from the router contract, not from arithmetic in the browser."

**Fai:** apri il goal appena la tx è confermata.

> "The balance moved, and the money is already working: the vault holds aUSDC on Aave, not idle USDC."

## 0:52 – 1:17 · Un utente nuovo si prende il suo namespace

**Fai:** cambia sull'account **merchant**, passa a **Sepolia**, vai su **Names**, scrivi `luigi`, premi **Claim your namespace**.

> "Here's a new user with nothing. One transaction, and he doesn't get an entry in our database — he gets his own ENSv2 registry and his own resolver, and he is root of both. `formica.eth` only delegates a registrar role to us; we cannot touch what's inside his namespace. That's the part of ENSv2 we actually wanted."

## 1:17 – 1:47 · Pagare a un nome

**Fai:** torna sul goal del saver e mostra il nome `vacanza-indonesia.mario.formica.eth`. Poi, **dal merchant** su Fuji: Receive → scrivi quel nome → **2.40** → conferma.

> "My own goal already lives under my namespace, and its address record points to the vault on Avalanche using the chain-specific coin type. The name is on Sepolia, the money is on Avalanche, and nothing bridges: it's a pointer. So he pays me knowing only my name — and before anything moves, the app asks the factory on Fuji whether that address really is a Formica goal. 2.40 in: 0.80 to me, 1.60 rounded into the goal."

## 1:47 – 2:40 · Il libretto privato su Swarm

**Fai:** sulla riga del movimento appena creato premi **add context**, scrivi `bar testaccio` · `bar` · `great coffee`, salva.

> "The chain knows how much, and to whom. It does not know what I bought — and it shouldn't: publishing your purchase history against your address is the thing you don't want. So the meaning goes to Swarm instead, encrypted under a key derived from my Swarm ID identity. There is no backend in this repository."

**Fai:** passa al **Browser B** e ricarica.

> "Different browser, same Swarm identity. The note is back — it came from the feed, not from local storage."

**Fai:** esegui il `curl` già pronto.

```bash
curl -H "Swarm-Only-Root-Chunk: true" \
  "https://download.gateway.ethswarm.org/feeds/65b03539d32383f802e487d705e015da8cd3aa06/15c7c6f182a364c29861b5fba1e10b593812ae105529386e43370a0b97e6b5b3"
```

> "Same data from a public Swarm gateway, outside the app: 4104 bytes of noise. The feed's manifest is published in the `formica.ledger` record of my name, so my ledger is discoverable from my name — and readable only by me."

## 2:40 – 3:00 · Chiusura onesta

> "To be exact about privacy: the amounts are public on Avalanche, and that's the point — it's what makes them verifiable. What's private is what they mean. Next: move the ledger key from the app's origin to the identity so it follows you anywhere, and use Swarm's access control to share a goal with the people saving for it with you."

## Da non dire mai

- Che gli importi siano privati: non lo sono.
- Che il libretto segua l'utente su qualunque dominio: oggi è legato all'origine dell'app, e sta scritto nel README.
- Qualunque funzione non mostrata a schermo.
