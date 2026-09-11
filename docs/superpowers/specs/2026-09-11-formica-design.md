# Formica — Design Document (v0.2)

- **Data:** 2026-09-11, ~20:30 Europe/Rome
- **Evento:** ETHRome 2026, Urbe Hub (hacking window aperta dalle 18:00 di ven 11)
- **Deadline submission:** dom 13 settembre 10:00 Europe/Rome (nessuna estensione)
- **Team:** 1 persona (solo)
- **Repo:** `ethRome2026` (pubblico, MIT). L'unico commit esistente è lo scaffold del repo, fatto dopo l'apertura della finestra (19:49); tutto il codice prodotto qui è nuovo.
- **Stato:** v0.2 — adversarial review applicata (vedi §17). Nessuna implementazione iniziata.

---

## 1. Obiettivi e vincoli

**Obiettivo primario:** un prodotto che gira **end-to-end** su testnet, con una demo dal vivo di 3 minuti, entro dom 10:00.

**Bounty target:**

| Bounty | Premio | Perché | Gate |
|---|---|---|---|
| **Team1 — Track A** (stablecoin che fanno real work) | $400 / $200 | Il core: flusso completo azione→prova on-chain su Fuji | Fuji deployment + demo dal vivo |
| **ENS** | pool $500, fino a 5 progetti | I goal sono nomi ENSv2 con registry programmabile, ruoli e record | Contratti beta su Sepolia, niente hardcoded |
| **Swarm** (stretch) | $500 × 2 | Estratti conto/ricevute cifrate di proprietà dell'utente | Solo se il core gira sabato sera |
| Arkiv | — | **Escluso**: gate sabato 20:00 (schema.md + friction.md + colloquio) incompatibile con il lavoro in solitaria | — |

**Regola guida:** uno scope stretto che gira batte uno largo che funziona a metà. Le feature non implementate non vengono dichiarate (regola: 15 punti su "stated functionality fully implemented").

---

## 2. Prodotto

**One-liner (IT):** *Prendi un pattern che milioni di persone già capiscono — Revolut Vaults / Acorns — e portalo in DeFi non-custodial: ogni obiettivo di risparmio è un vault ERC-4626 con un nome ENSv2, e il capitale lavora su Aave.*

**One-liner (EN, per README/submission):** *Round up your spending (and down your income) into named savings goals. Each goal is an ERC-4626 vault with an ENSv2 subname; funds earn yield on Aave and stay non-custodial.*

**Personas demo:**
- **Risparmiatore** (wallet utente, es. Mario): crea goal, paga, riceve, preleva.
- **Merchant / datore di lavoro** (seconda wallet demo): riceve il pagamento o paga lo stipendio con round-down.

### Flussi (tutti con tx reali)

1. **Claim namespace** — l'utente ottiene `mario.formica.eth`: deploya un `UserRegistry` ENSv2 personale (di cui è root) e chiama `FormicaRegistrar.claim("mario", ...)`, che registra il nome nel registry di `formica.eth` puntando al suo registry. Nessun backend, nessuna chiave admin in gioco.
2. **Crea goal** — es. "Vacanza", target 500 USDC, moltiplicatore x3, modalità Yield. Due passi: deploy del `GoalVault` su Fuji + subname ENSv2 `vacanza.mario.formica.eth` con record (indirizzo vault su Fuji via coinType, modalità, moltiplicatore, target).
3. **Spesa con round-up** — checkout "Caffè 4.30 USDC": la UI calcola `roundUp = (5.00 − 4.30) × 3 = 2.10`, addebito totale 6.40. Una sola tx: il merchant riceve 4.30, il vault riceve 2.10 (share al risparmiatore) e, se in modalità Yield, li deposita su Aave.
4. **Entrata con round-down** — "Stipendio 104.30 USDC": si arrotonda per difetto, la differenza `0.30 × moltiplicatore` va al goal, il destinatario incassa il resto. Una sola tx.
5. **Dashboard** — goal enumerati dalla factory su Fuji, nomi risolti live da ENSv2 su Sepolia: saldo, yield maturato, APY, progresso verso il target, storico depositi.
6. **Prelievo** — redeem delle share ERC-4626 in qualsiasi momento; il vault ritira da Aave e restituisce USDC.
7. **Prova per i giudici** — pagina che mostra la risoluzione live nome→vault (Universal Resolver) e i link Snowtrace/Etherscan di ogni tx. Nessun valore hardcoded nel percorso ENS.

### Cosa NON facciamo (tagli espliciti)

- Niente carte, banche, Plaid, fiat on/off-ramp: i pagamenti sono checkout in-app con test USDC.
- Niente smart account ERC-4337, niente gas sponsorship.
- Niente seconda strategia di yield: solo Aave V3 Fuji + modalità Liquid. Niente adapter astratto (vedi §16); non dichiariamo allocazioni o protocolli che non esistono.
- Niente profili Conservative/Balanced/Degen finti: le due modalità reali sono **Liquid** (0 rischio protocollo) e **Yield** (Aave).
- Niente token, niente fee, niente mainnet, niente audit.
- Niente multi-utente/social, niente notifiche, niente app mobile.
- Arkiv escluso (vedi §1).

---

## 3. Decisioni prese in brainstorming

| # | Domanda | Decisione |
|---|---|---|
| 1 | Bounty | Team1 Track A + ENS; Swarm stretch; Arkiv fuori |
| 2 | Team | Solo → scope minimo, fallback obbligatori |
| 3 | Origine pagamenti | Checkout merchant in-app; **anche** round-down sulle entrate |
| 4 | Nomi ENS | Spazio utente sotto il nostro nome padre (`*.formica.eth`) |
| 5 | Architettura | Vault ERC-4626 per-goal + router (Approach A; adapter rimosso in v0.2, il vault chiama Aave direttamente) |
| 6 | Nome progetto | **Formica** (nome padre: `formica.eth`, fallback `formica-savings.eth` / `formicaapp.eth`) |

---

## 4. Architettura

```
┌─────────────────────────── FRONTEND (Vite + React + wagmi/viem) ───────────────────────────┐
│  Dashboard │ Crea goal │ Checkout (spendi) │ Incassa (ricevi) │ Dettaglio goal │ Prova ENS │
└──────┬──────────────────────────────┬───────────────────────────────┬─────────────────────┘
       │ writes                       │ reads                         │ reads
       ▼                              ▼                               ▼
┌─────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────────┐
│ FUJI 43113 (money)  │   │ SEPOLIA (naming)          │   │ SWARM (stretch, storage)      │
│                     │   │                           │   │                               │
│ GoalVaultFactory ──► GoalVault (ERC-4626)            │   │ estratto conto/ricevute JSON  │
│ PaymentRouter       │   │ FormicaRegistrar (ruolo   │   │ cifrate client-side, upload   │
│ USDC (Circle)       │   │   registrar su formica.eth)│  │ via Swarm ID, bzz hash nel    │
│ Aave V3 Pool ◄──────┤   │ formica.eth               │   │ text record ENS               │
│  (chiamato dal vault)│  │  └ UserRegistry (utente)  │   │                               │
│                     │   │     └ goal subname        │   │                               │
│                     │   │       + resolver record   │   │                               │
└─────────────────────┘   └───────────────────────────┘   └───────────────────────────────┘
```

**Perché due chain:** Team1 richiede Fuji, ENSv2 beta vive su Sepolia. I soldi stanno su Fuji; i nomi su Sepolia. Il record ENS multichain (coinType EVM per Fuji) collega i due mondi: risolvere il nome restituisce l'indirizzo del vault su Fuji.

**Enumerazione:** i nomi ENS non sono enumerabili on-chain ([docs ENSv2](https://docs.ens.domains/ensv2/tutorial-app-developers)). Per la dashboard usiamo `factory.goalsOf(user)` su Fuji (eventi + array), mentre ENS resta la fonte di verità per nome e discovery. È un compromesso dichiarato, non nascosto.

---

## 5. Contratti su Fuji

Solidity ^0.8.24, Foundry, OpenZeppelin. Deploy diretto (niente proxy/clone): su testnet il gas non conta e la superficie di bug si riduce.

### 5.1 `GoalVault` (ERC-4626)

Un obiettivo = un vault. Custodisce USDC, opzionalmente li mette su Aave chiamando **direttamente** il Pool (nessun adapter intermedio).

```solidity
contract GoalVault is ERC4626, Ownable, ReentrancyGuard {
    enum Mode { LIQUID, YIELD }

    IPool   public immutable POOL;    // Aave V3 Pool, Fuji
    IERC20  public immutable A_TOKEN; // aUSDC
    string  public label;             // "vacanza" (mirror del subname ENS)
    Mode    public mode;
    uint8   public multiplier;        // 1..10
    uint256 public target;            // in USDC (6 dec)
    uint256 public netDeposited;      // principale netto (depositi - prelievi, floor a 0)

    function totalAssets() public view override returns (uint256);
        // asset.balanceOf(this) + A_TOKEN.balanceOf(this)   (aToken 1:1 sull'underlying)

    function maxDeposit(address receiver) public view override returns (uint256);
    function maxMint(address receiver) public view override returns (uint256);
        // 0 se receiver != owner(): solo l'owner detiene share del proprio goal

    function setMultiplier(uint8 m) external onlyOwner; // 1..10
    function setTarget(uint256 t) external onlyOwner;
    function setMode(Mode m) external onlyOwner nonReentrant; // migra i fondi

    function _deposit(...) internal override;  // super; netDeposited += assets; se YIELD: POOL.supply(asset, assets, address(this), 0)
    function _withdraw(...) internal override; // se l'idle non basta: POOL.withdraw(asset, mancante, address(this)); netDeposited -= assets (floor 0); poi super

    function renounceOwnership() public pure override; // revert OwnershipFixed()
    function transferOwnership(address) public pure override; // revert OwnershipFixed()
}
```

- **Modalità Liquid:** gli USDC restano nel vault, zero rischio protocollo.
- **Modalità Yield:** il vault fa `POOL.supply(..., onBehalfOf = address(this))` e riceve gli aUSDC; `POOL.withdraw(..., to = address(this))` brucia gli aUSDC del vault stesso (`msg.sender`). Nessun trasferimento di aToken. `totalAssets` include gli aUSDC, quindi il prezzo delle share cresce con lo yield.
- **Cambio modalità:** migration atomica idle↔Aave, owner-only, `nonReentrant`.
- **Solo l'owner detiene share:** `maxDeposit`/`maxMint` restituiscono 0 per qualsiasi `receiver` diverso dall'owner, quindi nessuno può depositare nel goal di un altro (né direttamente né via router) e il progresso verso il target conta solo i soldi dell'owner.
- **Prelievo sempre possibile** finché Aave ha liquidità. I nostri depositi *sono* liquidità del pool (su Fuji la liquidità libera oltre la nostra è ~120 USDC), quindi il redeem dei nostri fondi non resta bloccato salvo che qualcuno li prenda in prestito.
- **`netDeposited`:** principale netto (depositi meno prelievi, floor a 0), aggiornato in `_deposit`/`_withdraw`. Lo yield maturato è `convertToAssets(balanceOf(owner())) - netDeposited`: un'unica read invece di ricostruire la storia dai log `Deposit`/`Withdraw`.
- **Ownership fissata alla creazione:** `renounceOwnership()` e `transferOwnership(address)` fanno sempre revert con `OwnershipFixed()`, anche se chiamate dall'owner. Il registro `goalsOf` della factory è indicizzato per creatore: un trasferimento o una rinuncia lo desincronizzerebbero silenziosamente.
- Access control: owner = utente. Nessun admin esterno, nessuna fee, nessuna pausa.

### 5.2 `GoalVaultFactory`

```solidity
contract GoalVaultFactory {
    IERC20 public immutable asset;   // USDC (Circle) Fuji
    IPool  public immutable POOL;    // Aave V3 Pool Fuji
    IERC20 public immutable A_TOKEN; // aUSDC Fuji
    mapping(address => address[]) public goalsOf;
    mapping(address => bool) public isVault;

    event GoalCreated(address indexed owner, address indexed vault, string label);

    function createGoal(string calldata label, uint8 mode, uint8 multiplier, uint256 target)
        external returns (address vault);
    // owner = msg.sender; deploya GoalVault, registra in goalsOf/isVault
}
```

### 5.3 `PaymentRouter`

Il router legge il moltiplicatore **dal vault** (unica fonte di verità on-chain) e accetta solo vault registrati nella factory.

```solidity
contract PaymentRouter is ReentrancyGuard {
    uint256 public constant STEP = 1e6; // 1 USDC
    GoalVaultFactory public immutable FACTORY;
    IERC20           public immutable ASSET;

    event PaymentRounded(address indexed payer, address indexed merchant,
                         uint256 amount, uint256 saving, address vault);
    event IncomeRounded(address indexed payer, address indexed recipient,
                        uint256 amount, uint256 saving, address vault);

    function payWithRoundUp(address merchant, uint256 amount, address vault) external nonReentrant;
    function receiveWithRoundDown(uint256 amount, address vault) external nonReentrant;
}
```

**`payWithRoundUp`** (msg.sender = pagatore = risparmiatore):
```
require(FACTORY.isVault(vault) && amount > 0)
require(GoalVault(vault).owner() == payer)   // si risparmia solo nei propri goal
m       = GoalVault(vault).multiplier()
roundUp = ceil1(amount) - amount
saving  = roundUp * m
ASSET.safeTransferFrom(payer, merchant, amount)
ASSET.safeTransferFrom(payer, address(this), saving)
ASSET.forceApprove(vault, saving); GoalVault(vault).deposit(saving, payer)
```

**`receiveWithRoundDown`** (msg.sender = pagatore dell'entrata):
```
recipient = GoalVault(vault).owner()
floorAmt  = floor1(amount)
saving    = floorAmt == 0 ? 0 : min((amount - floorAmt) * m, floorAmt)
ASSET.safeTransferFrom(payer, recipient, amount - saving)
ASSET.safeTransferFrom(payer, address(this), saving)
ASSET.forceApprove(vault, saving); GoalVault(vault).deposit(saving, recipient)
```

### 5.4 Matematica degli arrotondamenti

- `ceil1(x)` = round up al prossimo multiplo di 1 USDC; `floor1(x)` = round down.
- **Spesa:** risparmi sempre la differenza verso l'intero successivo, moltiplicata. Importo già tondo → saving 0 (nessun addebito extra).
- **Entrata:** arrotondi per difetto e metti da parte la differenza (× moltiplicatore), con due tutele: importi < 1 USDC non generano saving, e il saving non supera la parte intera (`floorAmt`), così il destinatario non resta a zero. Con moltiplicatori alti e importi vicini a 1 USDC la UI mostra il netto prima della firma (edge accettato e documentato).
- Casi di test obbligatori: importo tondo, 0.01, 4.30, 104.30, 1.99 con x10, moltiplicatore 1 e 10, amount 0 (revert), vault non registrato (revert).
- Lo **step è fisso a 1 USDC**; step configurabile è fuori scope (annotato come estensione futura).

### 5.5 Integrazione Aave V3 (diretta, niente adapter)

Indirizzi Fuji verificati il 2026-09-11 da `bgd-labs/aave-address-book` (`AaveV3Fuji.sol`) e con `cast` on-chain:

| Contratto | Indirizzo |
|---|---|
| Aave V3 Pool | `0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40` |
| USDC (Circle, 6 dec) — l'asset dei vault | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| aUSDC | `0x9CFcc1B289E59FBe1E769f020C77315DF8473760` |

Il vault chiama il Pool direttamente: `supply(asset, amount, address(this), 0)` e `withdraw(asset, amount, address(this))`. `Pool.withdraw` brucia gli aToken di `msg.sender`, che è il vault stesso, quindi non serve trasferire aToken a nessuno. L'asset è l'**USDC ufficiale di Circle su Fuji** (faucet.circle.com): nessun token nostro.

**Stato reale del mercato (letto on-chain il 2026-09-11):** ~141 USDC depositati in totale, supply APR ≈ **0,13%**, reserve non toccata da giugno 2026. Conseguenza: su importi da demo lo yield maturato in minuti è sotto 1 unità minima (10 USDC × 5 min ≈ 0,0000001 USDC), quindi **il saldo non si muove visibilmente in demo**. La UI mostra il tasso letto da `getReserveData` (currentLiquidityRate) e dichiara che è un tasso di testnet; non si promette un saldo che cresce a vista.

Per i test: `MockPool` (supply/withdraw 1:1 con un `MockERC20` come aToken, yield simulato mintando aToken al vault) e `MockERC20` per l'USDC. L'astrazione `IStrategy` con adapter multipli passa in §16 (estensioni future).

### 5.6 Sicurezza

- `ReentrancyGuard` su router e `setMode`; `SafeERC20` ovunque; `forceApprove` azzerato prima di ogni approve.
- Il router accetta solo vault `isVault` (evita vault malevoli che fingono moltiplicatori assurdi) e, per le spese, solo vault di cui il pagatore è owner.
- Il vault detiene share solo per il suo owner (`maxDeposit`/`maxMint` = 0 per altri receiver).
- Il vault ha `asset`, `POOL` e `A_TOKEN` immutabili; l'owner può cambiare solo moltiplicatore, target e modalità.
- **Trust assumption dichiarata:** il pagatore approva il router (si consiglia `approve` massimo una volta). Il router è codice nostro non upgradabile; il rischio è limitato ai vault della factory. Non custodisce fondi tra una tx e l'altra.
- Nessun `delegatecall`, nessun upgrade, nessun oracolo (aToken 1:1).

---

## 6. ENSv2 su Sepolia

Riferimenti: [registry template](https://docs.ens.domains/ensv2/registry-template), [contract developers](https://docs.ens.domains/ensv2/tutorial-contract-developers), [deployments](https://docs.ens.domains/learn/deployments). **Contratti beta, non finali: da pinnare il commit di `contracts-v2` usato.**

### 6.1 Gerarchia

```
.eth registry
└── formica.eth (nostro)                → UserRegistry di Formica
    └── mario.formica.eth (owner: utente) → UserRegistry dell'utente (proxy, root = utente)
        └── vacanza.mario.formica.eth (owner: utente) → PermissionedResolver con i record
```

### 6.2 Setup una tantum (fatto da noi)

1. Registrare `formica.eth` su Sepolia (app.ens.dev; fee in MockUSDC free-mint, ETH da faucet). Se occupato → `formica-savings.eth`.
2. Deployare lo `UserRegistry` di `formica.eth` via `VerifiableFactory` + `UserRegistryImpl` (proxy UUPS), `initialize(rootAccount = admin Formica, roleBitmap)`.
3. `ETHRegistry.setSubregistry(labelhash("formica"), registryFormica)` per agganciare il nome alla gerarchia.
4. Deployare `FormicaRegistrar` (§6.3 bis) e concedergli `ROLE_REGISTRAR` sul registry di `formica.eth`. Da qui l'admin Formica non serve più per i claim.

### 6.3 Claim namespace (flow utente)

1. L'utente deploya il **proprio** `UserRegistry` via `VerifiableFactory` con `rootAccount = utente` (bitmap: `ROLE_REGISTRAR`/`_ADMIN`, `ROLE_RENEW`/`_ADMIN`, `ROLE_SET_RESOLVER`/`_ADMIN` sul root).
2. L'utente deploya il proprio `PermissionedResolver` via `VerifiableFactory` (`rootAccount = utente`).
3. L'utente chiama `FormicaRegistrar.claim("mario", registryUtente, resolverUtente)`: il registrar registra `mario` nel registry di `formica.eth` con `owner = msg.sender`, `subregistry = registry utente`, `resolver = resolver utente`, `roleBitmap` standard (owner può settare resolver, transfer, subregistry), expiry lunga (es. 1 anno; rinnovabile).

Da qui l'utente è **root del suo namespace**: noi non possiamo toccare i suoi nomi, lui può revocare tutto.

### 6.3 bis `FormicaRegistrar` (Sepolia)

Senza questo contratto il passo 3 richiederebbe la chiave dell'admin Formica, cioè un backend che l'architettura non ha. Il registrar è il titolare delegato del ruolo di registrazione su `formica.eth`: è l'uso dei **ruoli ENSv2** (delega di un permesso a un contratto) che il bounty ENS valuta come profondità d'integrazione.

```solidity
contract FormicaRegistrar {
    IPermissionedRegistry public immutable FORMICA_REGISTRY; // registry di formica.eth
    uint64 public constant DURATION = 365 days;

    event Claimed(string label, address indexed owner, address subregistry, address resolver);

    function claim(string calldata label, address subregistry, address resolver) external;
    // first-come-first-served: revert se il label è già registrato e non scaduto;
    // label validato (lunghezza minima, solo [a-z0-9-]); owner = msg.sender
}
```

- **Da verificare in fase 0:** che il registry ENSv2 accetti `ROLE_REGISTRAR` concesso a un contratto e la firma esatta di `register(...)` sul commit `contracts-v2` pinnato.
- **Test:** fork test Foundry su Sepolia contro il registry reale di `formica.eth` (claim ok, label doppio → revert, label non valido → revert).
- Nessun owner, nessuna fee, nessun upgrade.

### 6.4 Creazione goal (flow utente)

1. Tx Fuji: `factory.createGoal(...)` → indirizzo vault.
2. Tx Sepolia: `userRegistry.register("vacanza", owner=utente, subregistry=0, resolver=userResolver, roleBitmap, expiry)`.
3. Tx Sepolia: `userResolver.multicall([...])` con i record del goal.

### 6.5 Schema record (per goal)

| Tipo | Chiave | Valore |
|---|---|---|
| addr multichain | coinType ENSIP-11 `0x80000000 \| 43113` (= 2147526761) | indirizzo `GoalVault` su Fuji |
| text | `formica.mode` | `liquid` / `yield` |
| text | `formica.multiplier` | `1`..`10` |
| text | `formica.target` | importo in unità minime |
| text (stretch) | `formica.statement` | bzz hash dell'ultimo estratto conto Swarm |

I record sono discovery/UX; la fonte di verità dei parametri resta il vault on-chain (che il record punta). Evitiamo doppie fonti di verità: la UI mostra i record ENS e verifica l'indirizzo, i parametri li legge dal vault.

### 6.6 Read path

- `getEnsAddress({ name: normalize("vacanza.mario.formica.eth"), coinType: 2147526761 })` e `getEnsText` via Universal Resolver (`0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`).
- **Da verificare in fase 0:** versione minima di viem con supporto ENSv2 ([readiness](https://docs.ens.domains/web/ensv2-readiness)); se la read path non funziona, fallback su chiamate dirette al Universal Resolver / ENSjs.

### 6.7 Fallback dichiarato (trigger: sabato 15:00)

Se il `UserRegistry` per-utente non è stabile, i goal vengono registrati direttamente nel registry di `formica.eth` come `vacanza-mario.formica.eth` (sempre tramite `FormicaRegistrar`), con un resolver condiviso. Resta ENSv2 (registry gerarchico, ruoli, record, multichain addr), si perde un livello di annidamento. La scelta viene documentata nel README e nella submission.

---

## 7. Frontend

**Stack:** Vite + React + TypeScript + wagmi + viem + TanStack Query + Tailwind. Niente Next.js (SSR inutile con i wallet, build più pesante). Niente scaffold esterni pre-esistenti: setup minimale nostro.

**Pagine:**
1. **Dashboard** — i miei goal: nome ENS risolto, saldo, yield, progresso target, modo, moltiplicatore.
2. **Crea goal** — form + anteprima nome ENS (`<label>.<user>.formica.eth`), stato dei 3 step con tx link.
3. **Checkout (spendi)** — importo, scelta goal, anteprima matematica, `approve` (prima volta) + `payWithRoundUp`.
4. **Incassa (ricevi)** — importo, goal del destinatario (anche via nome ENS digitato), `receiveWithRoundDown`. Serve la wallet del pagatore (secondo account demo).
5. **Dettaglio goal** — share, prezzo share, APY, storico eventi, withdraw, link ENS explorer e Snowtrace.
6. **Prova** — risoluzione live nome→vault, indirizzi, tabella tx per i giudici.

**Stato e chain:** wagmi config con Fuji + Sepolia; `switchChain` quando serve; importo speso/pending tracciato per tx con stati `pending → mined → error`. La dashboard fa refetch su evento.

**Error handling:**
- Pre-check saldo/allowance → pulsante disabilitato con motivo.
- Revert decodificati con messaggi umani (saldo, allowance, liquidità Aave, vault non valido).
- Creazione goal in 3 step con ripresa idempotente: se il subname esiste già non si ri-registra; se il vault è già deployato si salta; ogni step mostra la sua tx.
- RPC: transport con fallback su endpoint secondario.
- Rete sbagliata → prompt di switch, blocco azione.

**Regole M1 (dalla final review di M0):**
- (a) Il saldo del goal si mostra come `convertToAssets(balanceOf(owner))`; lo "yield maturato" è quel valore meno `netDeposited`, clampato a ≥ 0. Non mostrare mai il prezzo share grezzo (`convertToAssets(1 share)`) né derivarne lo yield: dopo un redeem totale la dust del virtual share lo fa saltare a ~2.0 senza che sia maturato yield reale.
- (b) Prima di `createGoal`: normalizzare la label con `normalize()` (ENS), rifiutare label contenenti `.`, e controllare che non duplichi una label già usata dall'utente (`goalsOf`).
- (c) Disabilitare il toggle della modalità in cui il vault si trova già (`setMode(currentMode)` è un no-op silenzioso).
- (d) Mappare i codici di revert di Aave a un messaggio umano: "Liquidità Aave / riserva non disponibile".
- (e) Leggere gli eventi a partire da `deployBlock` (in `deployments/fuji.json`), a chunk: gli RPC pubblici di Avalanche limitano il range di `eth_getLogs`.
- (f) Passare sempre `maxPriorityFeePerGas`/`maxFeePerGas` espliciti e minimi (tip minima, come nello script di deploy) per non sprecare AVAX.

---

## 8. Swarm — stretch (time-box 3h, solo dopo il checkpoint di sabato 20:00)

- Prodotto: estratto conto / ricevute di pagamento in JSON, **cifrati client-side**, caricati su Swarm via `@snaha/swarm-id` (niente Bee node), recuperabili da un altro browser con la stessa identità Swarm.
- Il bzz hash dell'ultimo estratto va nel text record `formica.statement` (Sepolia).
- L'utente possiede il dato: nessun database nostro.
- **Cut-off:** se le API di `@snaha/swarm-id` non sono chiare entro sab 21:00, la feature si taglia e non si dichiara. Non si indovina l'API: si leggono i docs e i types in `node_modules`.
- Se entra, aggiungere Swarm alla submission form.

---

## 9. Testing e verifica

**Foundry (`contracts/test/`):**
- `GoalVault.t.sol` (con `MockPool`): deposit/redeem, share price, yield simulato, cambio modalità Liquid↔Yield, access control, `totalAssets`, `maxDeposit`/`maxMint` = 0 per receiver ≠ owner (deposito diretto di terzi → revert).
- `PaymentRouter.t.sol`: matematica round-up/round-down (tabella edge case §5.4), atomicità, revert su vault non registrato, revert su vault di un altro owner in `payWithRoundUp`, revert su amount 0, allowance insufficiente.
- `GoalVaultFactory.t.sol`: `goalsOf`, `isVault`, ownership.
- **Fork test Fuji** (`--fork-url $FUJI_RPC_URL`): vault in modalità Yield contro il Pool Aave reale, supply → redeem di importo minimo, USDC tornati. Più smoke test dallo script di deploy, con output salvato.
- **Fork test Sepolia**: `FormicaRegistrar` (§6.3 bis).

**Frontend:** nessun framework di test per scelta di tempo; checklist E2E manuale ripetuta prima della demo + un video di backup registrato sabato sera.

**Checklist E2E demo (da eseguire 2 volte prima del giudizio):**
1. Claim namespace da wallet pulita.
2. Crea goal → 3 tx verdi → nome risolto.
3. Checkout → saldo merchant + vault corretti, evento su Snowtrace.
4. Incassa → netto destinatario + saving corretti.
5. Yield: il vault in modalità Yield detiene aUSDC su Snowtrace e la UI mostra il tasso letto live da Aave (~0,13% su testnet). Non si mostra un saldo che cresce: su testnet non cresce a vista (§5.5).
6. Withdraw → USDC indietro.
7. Prova ENS: risoluzione live, nessun hardcode.

---

## 10. Deploy e operazioni

- **Env:** `.env` gitignored con `PRIVATE_KEY` (burner testnet), `FUJI_RPC_URL`, `SEPOLIA_RPC_URL`. Mai stampare o committare la chiave.
- **Faucet (per entrambi i wallet demo, da fare venerdì sera):** AVAX Fuji (Core testnet faucet), USDC Fuji (faucet.circle.com — ha un limite per richiesta), Sepolia ETH (faucet pubblico), MockUSDC ENS (mint libero).
- **Script:** `Deploy.s.sol` (Fuji: factory, router; smoke test Aave), `DeployRegistrar.s.sol` (Sepolia: `FormicaRegistrar` + grant del ruolo), script TS per setup ENS (registry, record).
- **Indirizzi:** pinnati in `frontend/src/config/addresses.ts` e nel README, con link agli explorer. (Le stringhe precise sono output del deploy, non decisioni di design.)
- **Verifica contratti:** opzionale su Snowtrace, tentata se avanza tempo.
- **Commit:** piccoli, uno per step (la history è valutata), con push su `origin/main` dopo ogni step che lascia la build funzionante.

---

## 11. Timeline e checkpoint

| Quando (Europe/Rome) | Milestone | Go/No-Go |
|---|---|---|
| Ven 20:30 → 01:00 | **M0**: scaffold, contratti, test verdi, deploy Fuji, smoke Aave, `formica.eth` registrato su Sepolia | Se Aave Fuji non funziona → solo modalità Liquid + nota onesta nel README |
| Sab 09:00 → 13:00 | **M1**: frontend core (dashboard, crea goal, checkout, withdraw) su Fuji | Se il core non gira → congelare feature |
| Sab 13:00 → 17:00 | **M2**: ENSv2 end-to-end (claim, subname, record, risoluzione) | Se per-user registry non va → fallback flat (§6.7) |
| Sab 17:00 → 20:00 | **M3**: demo completa provata + video di backup | **20:00 checkpoint**: core demo-able o si taglia tutto il resto |
| Sab 20:00 → 23:00 | **M4**: Swarm stretch *oppure* polish + README | Se Swarm non è chiaro entro 21:00 → taglio |
| Dom 08:00 → 10:00 | **M5**: video finale ≤3 min, README completo, submission form | **10:00 hard deadline** |

---

## 12. Rischi e mitigazioni

| Rischio | Prob. | Impatto | Mitigazione |
|---|---|---|---|
| ENSv2 beta instabile / API non documentate | Media | Alto (bounty ENS) | Pin del commit `contracts-v2`, lettura docs prima di scrivere, fallback flat, checkpoint sab 15:00 |
| Contratti Aave Fuji (indirizzi/faucet/cap) diversi da quanto trovato | Bassa | Medio | Indirizzi e mercato già verificati on-chain (§5.5); fork test in M0; se il Pool si rompe → modalità Liquid soltanto, dichiarato nel README |
| Yield invisibile in demo (APR testnet ~0,13%) | Certa | Basso | Mostrare il tasso live e gli aUSDC detenuti, non un saldo che cresce (§5.5) |
| `ROLE_REGISTRAR` non concedibile a un contratto | Bassa | Alto (claim senza backend) | Verifica fase 0; in extremis claim fatto dall'admin da script, dichiarato |
| Due chain = UX lenta in demo | Alta | Medio | `switchChain` gestito, tx pre-approvate, namespace pre-claimato per la wallet demo (solo il goal si crea live) |
| Tempo in solitaria | Alta | Alto | Tagli espliciti §2, checkpoint §11, stretch solo dopo M3 |
| Matematica arrotondamenti errata | Media | Alto | Unit test esaustivi prima della UI |
| viem non supporta ENSv2 read path | Bassa | Alto | Verifica fase 0; fallback chiamate dirette a Universal Resolver |
| Videomaking in ritardo | Media | Alto | Video di backup registrato sabato sera, rifinito domenica |

**Debolezze note da review:**
1. ~~Il meccanismo aToken dell'adapter~~ — risolto in v0.2: il vault chiama il Pool direttamente (§5.5).
2. La creazione goal richiede 3 firme su 2 chain: accettabile in demo, da valutare se ridurre con un relayer (solo se avanza tempo, mai prima del core).
3. L'enumerazione dei goal resta centralizzata sulla factory Fuji; non è indicizzata da ENS (limite noto di ENSv2).

---

## 13. Onestà dei claim (regola 15 punti)

**Dichiarato come funzionante:** round-up spese + round-down entrate atomiche; vault ERC-4626 per goal; fondi depositati sul mercato reale Aave V3 Fuji (yield al tasso di testnet, ~0,13% APR); nomi ENSv2 con registry per-utente, registrar delegato via ruoli, record; risoluzione live; withdraw non-custodial.

**Dichiarato come non fatto:** integrazioni bancarie/carte; mainnet; audit; seconda strategia; fee/token; gas sponsorship; step di arrotondamento configurabile; eventuale Swarm se tagliato.

**Nel README:** "i pagamenti sono simulati in-app con test USDC; nessun fondo reale; ENSv2 è in beta su Sepolia; Aave V3 è su Fuji testnet."

---

## 14. Submission checklist (dal manuale)

- [ ] Repo pubblico con README, run/deploy instructions, indirizzi contratti Fuji + Sepolia
- [ ] Video demo ≤ 3 min, apre senza login
- [ ] One-line description
- [ ] Tick **Team1** (Track A) e **ENS** nella submission form; Swarm solo se implementato
- [ ] Seconda form Team1 (link dagli organizzatori)
- [ ] Form submission entro **dom 10:00**
- [ ] Dichiarazione di eventuale codice pre-esistente (solo scaffold repo e librerie)
- [ ] Nessun claim non implementato

---

## 15. Verifiche da fare in fase 0 (prima di scrivere codice)

1. ~~Indirizzi Aave V3 Fuji~~ — fatto il 2026-09-11 (§5.5). Resta: prendere USDC da faucet.circle.com e verificare il limite per richiesta.
2. `formica.eth` disponibile su Sepolia (altrimenti variante).
3. Versione viem/wagmi con supporto ENSv2 read; commit `contracts-v2` da pinnare.
4. API `PermissionedResolver` per i write di record (ruoli EAC richiesti).
5. `ROLE_REGISTRAR` concedibile a un contratto (`FormicaRegistrar`) e firma di `register(...)`.
6. API `@snaha/swarm-id` (solo se si arriva allo stretch).

---

## 16. Estensioni future (non implementate, per il "dove lo porteremmo")

- Astrazione `IStrategy` con adapter multipli (Aave, Morpho/Spark dove disponibili) e veri profili di rischio.
- Step di arrotondamento configurabile (1/5/10) e arrotondamenti ricorrenti.
- Smart account con session key e gas sponsorship per l'UX mainstream.
- Indice dei goal e storico completo su Arkiv/Swarm con query per attributi.
- Cambio valuta e stablecoin multiple.

---

## 17. Changelog

**v0.3 (2026-09-12, final review di M0)**
1. **`netDeposited`:** contatore di principale netto sul vault (depositi meno prelievi, floor a 0), così lo yield maturato è una singola read invece di ricostruire i log `Deposit`/`Withdraw` (§5.1).
2. **Ownership fissata:** `renounceOwnership`/`transferOwnership` fanno sempre revert (`OwnershipFixed()`), a protezione del registro `goalsOf` indicizzato per creatore (§5.1).
3. **Regola prezzo share/yield per M1:** mai mostrare il prezzo share grezzo né derivarne lo yield (salta a ~2.0 dopo un redeem totale per la virtual-share dust di ERC-4626); yield = `convertToAssets(balanceOf(owner)) - netDeposited`, clampato ≥ 0 (§7).
4. **Altre regole M1 dalla review:** normalizzazione/unicità label prima di `createGoal`, toggle modo disabilitato sul modo corrente, mapping errori Aave, lettura eventi da `deployBlock` a chunk, tip minima esplicita sulle tx (§7).
5. **Redeploy su Fuji** con le due modifiche additive sopra; `deployments/fuji.json` ora include anche `deployBlock` per il chunking di `eth_getLogs` lato frontend (§10).

**v0.2 (2026-09-11, adversarial review)**
1. **Yield in demo:** verificato on-chain che il mercato USDC Aave Fuji rende ~0,13% APR con ~141 USDC depositati → niente "saldo che cresce" in demo; si mostra il tasso live (§5.5, §9 passo 5, §12).
2. **`FormicaRegistrar`:** il claim di `mario.formica.eth` non richiede più una chiave admin né un backend; il ruolo di registrazione è delegato a un contratto (§6.2 passo 4, §6.3, §6.3 bis).
3. **Share solo all'owner:** `maxDeposit`/`maxMint` = 0 per receiver ≠ owner; `payWithRoundUp` accetta solo vault del pagatore (§5.1, §5.3, §5.6).
4. **Niente adapter:** `AaveV3Strategy`/`IStrategy` rimossi, il vault chiama il Pool direttamente; risolve la debolezza nota #1 (§5.1, §5.5, §16).
5. **Asset = USDC di Circle su Fuji** (`0x5425…Bc65`, faucet.circle.com), indirizzi Aave verificati (§5.5, §10).
