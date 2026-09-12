# Formica — copione della demo (≤ 3 minuti)

Il video deve aprirsi **senza login**. Parlato in inglese, come la UI. I numeri qui sotto sono letti dai contratti il 2026-09-12: se a schermo ne compaiono altri, **vince lo schermo** — leggi quello che vedi, non quello che c'è scritto qui.

## Prima di premere REC

- [ ] Dev server **solo** su `http://localhost:5173`. Se la 5174 è ancora accesa, spegnila: il libretto Swarm è legato all'origine e dalla 5174 risulterebbe vuoto.
- [ ] Browser A (quello principale): app aperta sulla Dashboard, wallet **saver** `0x6567…CB5f`, rete **Fuji**, identità Swarm `0xfede` già connessa.
- [ ] Browser B: stessa app su `localhost:5173`, **già connesso** alla stessa identità Swarm, lasciato sul dettaglio di `vacanza-indonesia`. Serve solo da ricaricare in diretta.
- [ ] Un terminale pronto con il comando `curl` del punto 4 già digitato, **non ancora eseguito**.
- [ ] MetaMask con entrambi gli account, e **approvazione USDC già data** per il router: altrimenti ogni pagamento richiede due firme e il tempo vola.
- [ ] Nessun file `.env`, nessuna chiave, nessun terminale con segreti a schermo.
- [ ] Saldi di partenza: saver 14,6 USDC · merchant 2,9 USDC · goal `vacanza-indonesia` 2,8 USDC su 20 di target.

## 0:00 – 0:20 · Il problema

> "Saving is hard because it competes with spending. Formica removes the choice: you round up what you spend, and the change goes into a savings goal. Each goal is an ERC-4626 vault on Avalanche Fuji, earning yield on Aave, and it has its own ENS name."

**A schermo:** la Dashboard con i goal e i saldi.

## 0:20 – 1:05 · L'arrotondamento, in diretta

**Fai:** Spend → goal `vacanza-indonesia` → importo **4.30**.

> "I'm paying 4.30 to a merchant. My goal multiplies the change by four, so the app quotes it before I sign: the merchant gets 4.30, and 2.80 goes into my goal. Nothing is estimated in the browser — that number comes from the router contract."

**Fai:** conferma. Aspetta la conferma, poi apri il goal.

> "The balance went up, and the money is already on Aave: the vault holds aUSDC, not idle USDC."

## 1:05 – 1:45 · Il nome ENS, e pagare al nome

**Fai:** mostra nel dettaglio del goal il nome `vacanza-indonesia.mario.formica.eth`.

> "The goal has a name on ENSv2. `formica.eth` delegates a registrar role, so one transaction gives a user their own registry and resolver — they are root of their own namespace, we are not. The name lives on Sepolia and its address record points to the vault on Avalanche, using the chain-specific coin type. No bridge: it is just a pointer."

**Fai:** cambia in MetaMask sull'account **merchant** → Receive → scrivi `vacanza-indonesia.mario.formica.eth` → **2.40**.

> "Now someone pays me, and they only know my name. It resolves, and the app checks with the factory on Fuji that this address really is a Formica goal before letting the money move. 2.40 in: 0.80 to me, 1.60 rounded down into the goal."

**Fai:** conferma.

## 1:45 – 2:40 · Il libretto privato su Swarm

**Fai:** torna sul goal, sulla riga del movimento appena creato premi **add context**, scrivi `bar testaccio` · `bar` · `great coffee`, salva.

> "The chain knows how much and to whom. It does not know what I bought, and it should not: publishing your purchase history against your address is exactly what you don't want. So the meaning goes on Swarm instead, encrypted with a key derived from my Swarm ID identity. No server of ours — there is no backend in this repo."

**Fai:** passa al **Browser B** e ricarica.

> "Different browser, same Swarm identity. The note comes back — it came from the feed, not from local storage."

**Fai:** esegui il `curl` già pronto nel terminale.

```bash
curl -H "Swarm-Only-Root-Chunk: true" \
  "https://download.gateway.ethswarm.org/feeds/65b03539d32383f802e487d705e015da8cd3aa06/15c7c6f182a364c29861b5fba1e10b593812ae105529386e43370a0b97e6b5b3"
```

> "And here is the same data from a public Swarm gateway, outside the app: 4104 bytes of noise. The feed manifest is published in the `formica.ledger` text record of my name, so the ledger is discoverable from the name — but only I can read it."

## 2:40 – 3:00 · Chiusura onesta

> "To be precise about privacy: the amounts are public on Avalanche, and they should be — that's what makes them verifiable. What's private is what they mean. Next we would move the ledger key from the app's origin to the identity, so it follows you across devices and domains, and use Swarm's access control to share a goal with the people saving for it with you."

## Da non dire mai

- Che gli importi siano privati: non lo sono.
- Che il libretto segua l'utente su qualunque dominio: oggi è legato all'origine dell'app, ed è scritto nel README.
- Qualunque funzione non mostrata a schermo.
