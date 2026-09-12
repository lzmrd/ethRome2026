# Formica M2 — Pagare a un nome ENSv2

**Stato:** approvato 2026-09-12 13:55 · **Supera** il §6 della spec principale (`2026-09-11-formica-design.md`), che resta valido per il contesto e per i record.

**Obiettivo in una riga:** pagare scrivendo `vacanza.mario.formica.eth` invece di un indirizzo, con il nome su Sepolia (ENSv2 beta) che risolve al `GoalVault` su Avalanche Fuji.

**Perché conta:** è il bounty ENS ($500, fino a 5 progetti). ENS giudica per primo *quanto a fondo* si entra in v2: registry gerarchici, ruoli delegati, subname programmabili. Un nome che fa solo da etichetta non qualifica.

---

## 1. Decisioni prese

| Domanda | Scelta | Scartato |
|---|---|---|
| Chi risolve il nome | L'app Formica nel checkout | Trasferimento diretto da wallet qualsiasi: un `transfer` al vault non conia share e i fondi verrebbero contati come yield |
| Profondità della gerarchia | Namespace sovrano per utente (`mario.formica.eth` con registry proprio) | Registry condiviso (sovranità finta); un solo livello (rinuncia a ENSv2) |
| Transazioni per goal | 2 (registrazione + record) | 1 sola con delega di ruoli anche sul registry utente: dipende da API non ancora verificate, si scoprirebbe tardi |

## 2. Contratti ENSv2 beta usati (Sepolia, verificati on-chain il 2026-09-12)

| Contratto | Indirizzo |
|---|---|
| ETHRegistry | `0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2` |
| VerifiableFactory | `0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef` |
| UserRegistryImpl | `0x624a25d67b59d587752ebec8dded8827dae52050` |
| PermissionedResolverImpl | `0x9eae5c2730a7dd16bdd1dee6421a1b91e3b0365e` |
| Universal Resolver (proxy) | `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe` |

`formica.eth` è già registrato: owner `0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f`, token id `0x58b969c8a4ae5cc5f401f8ddd0b98d3a0b6ac57adf71b32217a1361b00000000`, scadenza 2027-09-12 (vedi `deployments/sepolia.md`).

**I contratti beta non sono finali.** Le firme qui sotto vengono dalla documentazione ENS del 2026-09-12 (`docs.ens.domains/llms-full.txt`), non da memoria. Prima di scrivere codice, il piano le rilegge.

```solidity
// VerifiableFactory
function deployProxy(address implementation, uint256 salt, bytes memory data) external returns (address proxy);
event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation);

// UserRegistry (proxy di UserRegistryImpl)
function initialize(address rootAccount, uint256 roleBitmap) public initializer;

// PermissionedRegistry (base di ogni registry ENSv2)
function register(string label, address owner, IRegistry subregistry, address resolver, uint256 roleBitmap, uint64 expiry) external returns (uint256 tokenId);
function setSubregistry(uint256 anyId, address subregistry) external;
function setResolver(uint256 anyId, address resolver) external;
function grantRootRoles(uint256 roleBitmap, address account) external;

// PermissionedResolver (proxy di PermissionedResolverImpl)
function initialize(address admin, uint256 roleBitmap, bytes[] setters) external;
function setAddr(bytes32 node, uint256 coinType, bytes value) external;   // richiede ROLE_SET_ADDR
function setText(bytes32 node, string key, string value) external;        // richiede ROLE_SET_TEXT
```

Ruoli del registry: `ROLE_REGISTRAR = 1 << 0`, `ROLE_RENEW = 1 << 16`, `ROLE_SET_SUBREGISTRY = 1 << 20`, `ROLE_SET_RESOLVER = 1 << 24`. Ogni ruolo ha il suo admin a `role << 128`. `expiry` è un timestamp assoluto, non una durata.

**coinType di Avalanche Fuji (ENSIP-11):** `0x80000000 | 43113` = **2147526761**.

## 3. Gerarchia

```
.eth  (ETHRegistry)
└── formica.eth              → registryFormica (UserRegistry, root = wallet Formica)
    └── mario.formica.eth    → registryUtente  (UserRegistry, root = UTENTE)
        └── vacanza.mario.formica.eth → record addr(2147526761) = GoalVault su Fuji
```

## 4. Setup una tantum (quattro tx, wallet che possiede `formica.eth`)

1. `VerifiableFactory.deployProxy(UserRegistryImpl, salt, initialize(wallet, ALL_ROLES))` → `registryFormica`.
2. `ETHRegistry.setSubregistry(uint256(labelhash("formica")), registryFormica)`. **Senza questo passo i nomi esistono come token ma non risolvono:** lo Universal Resolver cammina i `getSubregistry()` dalla radice.
3. Deploy di `FormicaRegistrar` (nostro, Foundry).
4. `registryFormica.grantRootRoles(ROLE_REGISTRAR | ROLE_RENEW, formicaRegistrar)`.

Dopo il passo 4 la nostra chiave non serve più: i claim li fa il contratto. È la delega di ruolo che dimostra l'integrazione v2.

Lo script è **idempotente**: rilegge `deployments/sepolia.md` e salta i passi già fatti, così se la beta si azzera si rifà senza pensarci.

## 5. `FormicaRegistrar` — una transazione per utente

```solidity
contract FormicaRegistrar {
    IPermissionedRegistry public immutable FORMICA_REGISTRY;
    IVerifiableFactory   public immutable FACTORY;
    address public immutable USER_REGISTRY_IMPL;
    address public immutable RESOLVER_IMPL;
    uint64  public constant DURATION = 365 days;

    mapping(address => string) public labelOf;      // owner → label, per la UI
    event Claimed(string label, address indexed owner, address registry, address resolver);

    function claim(string calldata label) external returns (address registry, address resolver);
}
```

`claim` in ordine: valida la label, deploya il `UserRegistry` dell'utente (`rootAccount = msg.sender`), deploya il suo `PermissionedResolver` (`admin = msg.sender`), registra la label dentro `formica.eth` con `owner = msg.sender`, `subregistry = registryUtente`, `resolver = resolverUtente`, `expiry = block.timestamp + DURATION`.

- **Label valida:** 1–32 caratteri, solo `a-z`, `0-9`, `-`; niente punti; non può iniziare o finire con `-`.
- **First-come-first-served:** se la label è già registrata e non scaduta, revert.
- Il registrar **non trattiene alcun ruolo** dentro i contratti dell'utente: deploya e se ne va.
- Nessun owner, nessuna fee, nessun upgrade, nessuna pausa.

## 6. Nome di un goal (due tx, dal frontend)

1. `registryUtente.register("vacanza", utente, IRegistry(0), resolverUtente, roleBitmap, expiry)`
2. `resolverUtente.setAddr(namehash("vacanza.mario.formica.eth"), 2147526761, abi.encodePacked(vault))`

Se resta tempo: `setText` con `formica.mode`, `formica.multiplier`, `formica.target`. I record sono per scoperta e UX: **la fonte di verità dei parametri resta il vault su Fuji**, che l'app legge comunque.

## 7. Read path e frontend

- **Checkout per nome:** l'utente scrive il nome, l'app chiama `getEnsAddress({ name: normalize(nome), coinType: 2147526761 })` sullo Universal Resolver di Sepolia, ottiene l'indirizzo su Fuji, poi **verifica su Fuji `factory.isVault(indirizzo)`** e solo allora chiama `payWithRoundUp`. Se la verifica fallisce: "Questo nome non punta a un goal Formica".
- Il campo indirizzo resta, come ripiego: il nome è la strada principale, non l'unica.
- **Dashboard:** mostra `<goal>.<utente>.formica.eth` per i goal che hanno un nome, con link all'ENS Explorer; i goal senza nome mostrano il pulsante per registrarlo.
- Il nome dell'utente si legge da `FormicaRegistrar.labelOf(address)`, quello del goal dalla `label()` del vault: nessuno stato duplicato nel frontend.

## 8. Test

- **Fork test Foundry su Sepolia**, contro i contratti beta reali: claim valido (e il subregistry di `mario` risulta il registry dell'utente); label già presa → revert; label non valida → revert; l'utente è root del proprio registry e il registrar non ha ruoli.
- **Prova a mano**, come `docs/e2e-m1.md`: claim, nome del goal, pagamento scrivendo il nome, con i link alle tx.

## 9. Rischi

| Rischio | Mitigazione |
|---|---|
| Gas su Sepolia: il claim fa due deploy e una registrazione in una tx; il wallet ha 0,0098 ETH | **Prima cosa da misurare.** Se è troppo caro o troppo grosso, si spezza il claim in due tx |
| La beta ENSv2 si azzera (ENS avvisa che succede a ogni redeploy) | Script di setup idempotente + stato in `deployments/sepolia.md`; se succede durante la demo, si rifà in quattro tx |
| Un nome può puntare a un indirizzo qualsiasi | `isVault()` su Fuji prima di ogni pagamento |
| Tempo: consegna domenica 10:00 | Se alle 17:00 il claim non funziona, si taglia ai soli nomi utente e i goal restano senza nome |

## 10. Fuori scope

Rinnovo e trasferimento dei nomi, reverse record, delega di ruoli sul registry dell'utente (l'opzione B: una tx per goal), pagamento diretto da wallet esterni.
