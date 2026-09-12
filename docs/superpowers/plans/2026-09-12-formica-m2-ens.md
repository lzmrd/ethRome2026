# Formica M2 — Pagare a un nome ENSv2 · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** far sì che si possa pagare scrivendo `vacanza.mario.formica.eth` invece di un indirizzo: il nome vive su Sepolia (ENSv2 beta) e risolve al `GoalVault` su Avalanche Fuji.

**Architecture:** `FormicaRegistrar` (nostro, Sepolia) tiene il `ROLE_REGISTRAR` delegato sul registry di `formica.eth`; con una transazione deploya per l'utente un `UserRegistry` e un `PermissionedResolver` di cui **l'utente è root**, e registra `<label>.formica.eth`. L'utente poi registra i nomi dei goal nel proprio registry e scrive il record `addr(coinType 2147526761)` verso il vault su Fuji. Il frontend risolve il nome con lo Universal Resolver e verifica su Fuji con `isVault()` prima di pagare.

**Tech Stack:** Solidity 0.8.24 + Foundry + OpenZeppelin v5.1.0 (`contracts/`) · Vite + React + TS + wagmi v3 + viem (`frontend/`) · ENSv2 beta su Sepolia · Aave V3 + USDC su Fuji.

**Spec:** `docs/superpowers/specs/2026-09-12-formica-m2-ens-design.md` (leggila: contiene indirizzi, firme verificate e le bitmap dei ruoli).

## Global Constraints

- Usare **sempre** `~/.foundry/bin/forge` e `~/.foundry/bin/cast`: su questa macchina `/usr/bin/forge` è un altro programma.
- Ogni broadcast passa una tip minima: `--priority-gas-price 1 --with-gas-price 1000` su Fuji. **Su Sepolia no**: lì la base fee è nell'ordine dei gwei, quindi si lasciano le stime di default.
- Solidity `^0.8.24`, OpenZeppelin `v5.1.0`. Niente proxy nostri, niente upgrade, niente fee, niente owner, niente pausa in `FormicaRegistrar`.
- Contratti ENSv2 beta su Sepolia (verificati on-chain il 2026-09-12): ETHRegistry `0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2` · VerifiableFactory `0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef` · UserRegistryImpl `0x624a25d67b59d587752ebec8dded8827dae52050` · PermissionedResolverImpl `0x9eae5c2730a7dd16bdd1dee6421a1b91e3b0365e` · Universal Resolver `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`.
- `formica.eth`: owner `0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f`, token id `0x58b969c8a4ae5cc5f401f8ddd0b98d3a0b6ac57adf71b32217a1361b00000000` (labelhash di `formica` con i 32 bit bassi azzerati).
- coinType di Avalanche Fuji (ENSIP-11): **2147526761**.
- Ruoli: `ROLE_REGISTRAR = 1 << 0`, `ROLE_RENEW = 1 << 16`, `ROLE_SET_SUBREGISTRY = 1 << 20`, `ROLE_SET_RESOLVER = 1 << 24`; admin di ogni ruolo a `role << 128`; `ALL_ROLES = 0x1111111111111111111111111111111111111111111111111111111111111111`.
- Segreti: chiavi burner solo in `contracts/.env` (gitignored). Mai stampare, committare o incollare una chiave privata. Caricare le variabili solo così: `set -a && . ./.env && set +a`.
- Commit piccoli, uno per task, push su `origin/main` quando i test sono verdi. Trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Onestà:** non dichiarare in README o demo una funzione non implementata, e non spuntare una checklist per lettura del codice.
- Scadenze: checkpoint sab 12 set 20:00 · consegna **dom 13 set 10:00**.

## File Structure

```
contracts/
  src/ens/IEnsV2.sol          # sottoinsiemi minimi delle interfacce ENSv2 che chiamiamo
  src/ens/EnsSepolia.sol      # indirizzi beta + coinType + costanti dei ruoli
  src/FormicaRegistrar.sol    # il registrar delegato: claim() in una tx
  test/mocks/MockEnsRegistry.sol    # registry finto (register, grantRootRoles, getSubregistry)
  test/mocks/MockVerifiableFactory.sol
  test/FormicaRegistrar.t.sol       # unit test con i mock
  test/fork/SepoliaEnsFork.t.sol    # fork test contro i contratti beta reali
  script/SetupEns.s.sol             # setup idempotente su Sepolia, scrive deployments/sepolia-ens.json
  deployments/sepolia-ens.json      # output del setup (committato)
frontend/src/
  config/ens.ts               # indirizzi Sepolia, coinType, ABI ENS
  hooks/useEnsGoal.ts         # risolvi nome -> vault (Sepolia) + verifica isVault (Fuji)
  hooks/useEnsNames.ts        # labelOf dell'utente, nome di un goal, registrazione
  pages/Names.tsx             # claim del namespace + assegna nome a un goal
  pages/Spend.tsx             # (modifica) il campo merchant accetta un nome
  pages/GoalDetail.tsx        # (modifica) mostra il nome del goal e il link all'explorer
deployments/sepolia.md        # (modifica) stato ENS dopo il setup reale
docs/e2e-m2.md                # checklist della prova a mano
```

---
### Task 1: Interfacce ENSv2, costanti e `FormicaRegistrar` (con unit test)

**Files:**
- Create: `contracts/src/ens/IEnsV2.sol`, `contracts/src/ens/EnsSepolia.sol`, `contracts/src/FormicaRegistrar.sol`
- Create: `contracts/test/mocks/MockEnsRegistry.sol`, `contracts/test/mocks/MockVerifiableFactory.sol`
- Test: `contracts/test/FormicaRegistrar.t.sol`

**Interfaces:**
- Consumes: nulla dei task precedenti.
- Produces: `FormicaRegistrar.claim(string label) returns (address registry, address resolver)`, `FormicaRegistrar.labelOf(address) view returns (string)`, evento `Claimed(string label, address indexed owner, address registry, address resolver)`, errori `InvalidLabel()`, `AlreadyClaimed()`. Costanti in `EnsSepolia`: `ETH_REGISTRY`, `VERIFIABLE_FACTORY`, `USER_REGISTRY_IMPL`, `RESOLVER_IMPL`, `UNIVERSAL_RESOLVER`, `FUJI_COIN_TYPE`, `ALL_ROLES`, `USER_NAME_ROLES`.

- [ ] **Step 1: Scrivi le interfacce ENSv2**

`contracts/src/ens/IEnsV2.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Sottoinsieme minimo dei contratti ENSv2 beta che Formica chiama.
/// Firme dalla documentazione ENS del 2026-09-12 (docs.ens.domains/llms-full.txt).
interface IPermissionedRegistry {
    function register(
        string calldata label,
        address owner,
        address subregistry,
        address resolver,
        uint256 roleBitmap,
        uint64 expiry
    ) external returns (uint256 tokenId);

    function grantRootRoles(uint256 roleBitmap, address account) external;

    function setSubregistry(uint256 anyId, address subregistry) external;

    function getSubregistry(string calldata label) external view returns (address);

    function getResolver(string calldata label) external view returns (address);
}

interface IVerifiableFactory {
    function deployProxy(address implementation, uint256 salt, bytes calldata data)
        external
        returns (address proxy);
}

interface IUserRegistryInit {
    function initialize(address rootAccount, uint256 roleBitmap) external;
}

interface IPermissionedResolverInit {
    function initialize(address admin, uint256 roleBitmap, bytes[] calldata setters) external;
}

interface IPermissionedResolver {
    function setAddr(bytes32 node, uint256 coinType, bytes calldata value) external;
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory);
}
```

- [ ] **Step 2: Scrivi le costanti**

`contracts/src/ens/EnsSepolia.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Indirizzi della beta ENSv2 su Sepolia e costanti dei ruoli.
library EnsSepolia {
    uint256 internal constant CHAIN_ID = 11155111;

    address internal constant ETH_REGISTRY = 0xbdc85DD5b15d7ECB354cD7cB6f2C50b4F2C4F0e2;
    address internal constant VERIFIABLE_FACTORY = 0x10Dc6333cDFe1fcEf624C6e0a8221b91804cd7EF;
    address internal constant USER_REGISTRY_IMPL = 0x624A25d67b59d587752EBEc8dded8827dAe52050;
    address internal constant RESOLVER_IMPL = 0x9eaE5c2730a7dD16bDd1DEe6421A1b91E3b0365E;
    address internal constant UNIVERSAL_RESOLVER = 0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe;

    /// @notice ENSIP-11: 0x80000000 | 43113 (Avalanche Fuji).
    uint256 internal constant FUJI_COIN_TYPE = 2147526761;

    uint256 internal constant ROLE_REGISTRAR = 1 << 0;
    uint256 internal constant ROLE_RENEW = 1 << 16;
    uint256 internal constant ROLE_SET_SUBREGISTRY = 1 << 20;
    uint256 internal constant ROLE_SET_RESOLVER = 1 << 24;
    uint256 internal constant ADMIN_SHIFT = 128;

    /// @notice Ogni ruolo e il suo admin: il root del registry governa tutto.
    uint256 internal constant ALL_ROLES =
        0x1111111111111111111111111111111111111111111111111111111111111111;

    /// @notice Bitmap del nome dell'utente dentro formica.eth: può cambiare
    /// subregistry e resolver e rinnovare, con i rispettivi admin.
    uint256 internal constant USER_NAME_ROLES = ROLE_SET_SUBREGISTRY | ROLE_SET_RESOLVER | ROLE_RENEW
        | (ROLE_SET_SUBREGISTRY << ADMIN_SHIFT) | (ROLE_SET_RESOLVER << ADMIN_SHIFT)
        | (ROLE_RENEW << ADMIN_SHIFT);
}
```

Gli indirizzi vanno scritti con il checksum EIP-55 corretto o `forge build` fallisce. Per ottenerlo: `~/.foundry/bin/cast to-check-sum-address 0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2` e così per gli altri quattro. **Controlla ognuno**: quelli scritti qui sopra vanno verificati, non copiati alla cieca.

- [ ] **Step 3: Scrivi i mock**

`contracts/test/mocks/MockEnsRegistry.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPermissionedRegistry} from "../../src/ens/IEnsV2.sol";

/// @notice Registry ENSv2 finto: registra label e tiene traccia di ruoli e record.
contract MockEnsRegistry is IPermissionedRegistry {
    error NameNotAvailable(string label);
    error Unauthorized(address caller);

    struct Entry {
        address owner;
        address subregistry;
        address resolver;
        uint256 roleBitmap;
        uint64 expiry;
    }

    mapping(string => Entry) public entries;
    mapping(address => uint256) public rootRoles;
    uint256 public registerCalls;

    function register(
        string calldata label,
        address owner,
        address subregistry,
        address resolver,
        uint256 roleBitmap,
        uint64 expiry
    ) external returns (uint256) {
        if (rootRoles[msg.sender] & (1 << 0) == 0) revert Unauthorized(msg.sender);
        Entry storage existing = entries[label];
        if (existing.owner != address(0) && existing.expiry > block.timestamp) {
            revert NameNotAvailable(label);
        }
        entries[label] = Entry(owner, subregistry, resolver, roleBitmap, expiry);
        registerCalls++;
        return uint256(keccak256(bytes(label)));
    }

    function grantRootRoles(uint256 roleBitmap, address account) external {
        rootRoles[account] |= roleBitmap;
    }

    function setSubregistry(uint256, address) external {}

    function getSubregistry(string calldata label) external view returns (address) {
        return entries[label].subregistry;
    }

    function getResolver(string calldata label) external view returns (address) {
        return entries[label].resolver;
    }
}
```

`contracts/test/mocks/MockVerifiableFactory.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifiableFactory} from "../../src/ens/IEnsV2.sol";

/// @notice Istanza minima che registra chi l'ha inizializzata, così i test
/// possono verificare che il root sia l'utente e non il registrar.
contract MockProxy {
    address public implementation;
    address public root;
    bool public initialized;

    constructor(address implementation_, bytes memory data) {
        implementation = implementation_;
        // I due initialize dell'ENSv2 iniziano entrambi con (address, uint256, ...):
        // il primo argomento è il root/admin.
        (address account,) = abi.decode(_slice(data), (address, uint256));
        root = account;
        initialized = true;
    }

    function _slice(bytes memory data) private pure returns (bytes memory out) {
        out = new bytes(data.length - 4);
        for (uint256 i = 4; i < data.length; i++) {
            out[i - 4] = data[i];
        }
    }
}

contract MockVerifiableFactory is IVerifiableFactory {
    event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation);

    mapping(bytes32 => bool) public used;

    function deployProxy(address implementation, uint256 salt, bytes calldata data)
        external
        returns (address proxy)
    {
        bytes32 outer = keccak256(abi.encode(msg.sender, salt));
        require(!used[outer], "salt used");
        used[outer] = true;
        proxy = address(new MockProxy(implementation, data));
        emit ProxyDeployed(msg.sender, proxy, salt, implementation);
    }
}
```

- [ ] **Step 4: Scrivi i test che falliscono**

`contracts/test/FormicaRegistrar.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FormicaRegistrar} from "../src/FormicaRegistrar.sol";
import {EnsSepolia} from "../src/ens/EnsSepolia.sol";
import {MockEnsRegistry} from "./mocks/MockEnsRegistry.sol";
import {MockVerifiableFactory, MockProxy} from "./mocks/MockVerifiableFactory.sol";

contract FormicaRegistrarTest is Test {
    MockEnsRegistry internal registry;
    MockVerifiableFactory internal factory;
    FormicaRegistrar internal registrar;

    address internal constant USER_REGISTRY_IMPL = address(0xAAA1);
    address internal constant RESOLVER_IMPL = address(0xAAA2);
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event Claimed(string label, address indexed owner, address registry, address resolver);

    function setUp() public {
        registry = new MockEnsRegistry();
        factory = new MockVerifiableFactory();
        registrar = new FormicaRegistrar(address(registry), address(factory), USER_REGISTRY_IMPL, RESOLVER_IMPL);
        registry.grantRootRoles(EnsSepolia.ROLE_REGISTRAR | EnsSepolia.ROLE_RENEW, address(registrar));
    }

    function test_claim_registersLabelWithUserAsRoot() public {
        vm.prank(alice);
        (address userRegistry, address userResolver) = registrar.claim("mario");

        assertEq(registry.getSubregistry("mario"), userRegistry, "subregistry");
        assertEq(registry.getResolver("mario"), userResolver, "resolver");
        (address owner,,, uint256 roles, uint64 expiry) = registry.entries("mario");
        assertEq(owner, alice, "owner");
        assertEq(roles, EnsSepolia.USER_NAME_ROLES, "bitmap");
        assertEq(expiry, uint64(block.timestamp) + registrar.DURATION(), "expiry");
        assertEq(MockProxy(userRegistry).root(), alice, "registry root = utente");
        assertEq(MockProxy(userResolver).root(), alice, "resolver admin = utente");
        assertEq(registrar.labelOf(alice), "mario", "labelOf");
    }

    function test_claim_emitsClaimed() public {
        vm.expectEmit(false, true, false, false);
        emit Claimed("mario", alice, address(0), address(0));
        vm.prank(alice);
        registrar.claim("mario");
    }

    function test_claim_revertsOnSecondClaimBySameOwner() public {
        vm.startPrank(alice);
        registrar.claim("mario");
        vm.expectRevert(FormicaRegistrar.AlreadyClaimed.selector);
        registrar.claim("mario2");
        vm.stopPrank();
    }

    function test_claim_revertsWhenLabelTaken() public {
        vm.prank(alice);
        registrar.claim("mario");
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(MockEnsRegistry.NameNotAvailable.selector, "mario"));
        registrar.claim("mario");
    }

    function test_claim_rejectsInvalidLabels() public {
        string[7] memory bad = ["", "Mario", "ma.rio", "-mario", "mario-", "ma rio", "mario_1"];
        for (uint256 i = 0; i < bad.length; i++) {
            vm.prank(alice);
            vm.expectRevert(FormicaRegistrar.InvalidLabel.selector);
            registrar.claim(bad[i]);
        }
    }

    function test_claim_rejectsLabelLongerThan32() public {
        vm.prank(alice);
        vm.expectRevert(FormicaRegistrar.InvalidLabel.selector);
        registrar.claim("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"); // 33 caratteri
    }

    function test_claim_acceptsDigitsAndInnerHyphen() public {
        vm.prank(alice);
        registrar.claim("mario-1");
        assertEq(registrar.labelOf(alice), "mario-1");
    }

    function test_claim_twoUsersGetDifferentProxies() public {
        vm.prank(alice);
        (address r1,) = registrar.claim("mario");
        vm.prank(bob);
        (address r2,) = registrar.claim("luigi");
        assertTrue(r1 != r2, "proxy distinti");
    }
}
```

- [ ] **Step 5: Esegui i test e verifica che falliscano**

Run: `cd contracts && ~/.foundry/bin/forge test --match-contract FormicaRegistrarTest`
Expected: FAIL, il file `src/FormicaRegistrar.sol` non esiste.

- [ ] **Step 6: Scrivi `FormicaRegistrar`**

`contracts/src/FormicaRegistrar.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IPermissionedRegistry,
    IVerifiableFactory,
    IUserRegistryInit,
    IPermissionedResolverInit
} from "./ens/IEnsV2.sol";
import {EnsSepolia} from "./ens/EnsSepolia.sol";

/// @notice Registrar delegato di formica.eth: con una transazione l'utente
/// ottiene il proprio namespace ENSv2, di cui è root. Il registrar deploya i
/// contratti dell'utente ma non tiene alcun ruolo al loro interno.
/// Nessun owner, nessuna fee, nessun upgrade.
contract FormicaRegistrar {
    error InvalidLabel();
    error AlreadyClaimed();

    event Claimed(string label, address indexed owner, address registry, address resolver);

    IPermissionedRegistry public immutable FORMICA_REGISTRY;
    IVerifiableFactory public immutable FACTORY;
    address public immutable USER_REGISTRY_IMPL;
    address public immutable RESOLVER_IMPL;

    uint64 public constant DURATION = 365 days;

    /// @notice label ENS scelta da ciascun utente (vuota se non ha ancora fatto claim).
    mapping(address => string) public labelOf;

    constructor(address formicaRegistry, address factory, address userRegistryImpl, address resolverImpl) {
        FORMICA_REGISTRY = IPermissionedRegistry(formicaRegistry);
        FACTORY = IVerifiableFactory(factory);
        USER_REGISTRY_IMPL = userRegistryImpl;
        RESOLVER_IMPL = resolverImpl;
    }

    /// @notice Registra `label`.formica.eth per chi chiama, con registry e
    /// resolver propri. Chi chiama diventa root del proprio namespace.
    function claim(string calldata label) external returns (address registry, address resolver) {
        if (!_isValidLabel(label)) revert InvalidLabel();
        if (bytes(labelOf[msg.sender]).length != 0) revert AlreadyClaimed();

        registry = FACTORY.deployProxy(
            USER_REGISTRY_IMPL,
            uint256(keccak256(abi.encode(msg.sender, label, "registry"))),
            abi.encodeCall(IUserRegistryInit.initialize, (msg.sender, EnsSepolia.ALL_ROLES))
        );

        resolver = FACTORY.deployProxy(
            RESOLVER_IMPL,
            uint256(keccak256(abi.encode(msg.sender, label, "resolver"))),
            abi.encodeCall(
                IPermissionedResolverInit.initialize, (msg.sender, EnsSepolia.ALL_ROLES, new bytes[](0))
            )
        );

        FORMICA_REGISTRY.register(
            label,
            msg.sender,
            registry,
            resolver,
            EnsSepolia.USER_NAME_ROLES,
            uint64(block.timestamp) + DURATION
        );

        labelOf[msg.sender] = label;
        emit Claimed(label, msg.sender, registry, resolver);
    }

    /// @dev 1..32 caratteri, solo [a-z0-9-], senza trattino iniziale o finale.
    function _isValidLabel(string calldata label) private pure returns (bool) {
        bytes calldata b = bytes(label);
        if (b.length == 0 || b.length > 32) return false;
        if (b[0] == "-" || b[b.length - 1] == "-") return false;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c == "-";
            if (!ok) return false;
        }
        return true;
    }
}
```

- [ ] **Step 7: Esegui i test e verifica che passino**

Run: `cd contracts && ~/.foundry/bin/forge test --match-contract FormicaRegistrarTest -vv`
Expected: PASS, 8 test.

Se `test_claim_registersLabelWithUserAsRoot` fallisce sulla decodifica dentro `MockProxy`, il problema è il taglio del selettore in `_slice`: `abi.encodeCall` produce 4 byte di selettore seguiti dagli argomenti, e il test decodifica `(address, uint256)` dai byte successivi.

- [ ] **Step 8: Esegui tutta la suite e committa**

Run: `cd contracts && set -a && . ./.env && set +a && ~/.foundry/bin/forge test`
Expected: i 53 test di M0/M1 restano verdi, più i nuovi.

```bash
git add contracts/src/ens contracts/src/FormicaRegistrar.sol contracts/test/mocks/MockEnsRegistry.sol contracts/test/mocks/MockVerifiableFactory.sol contracts/test/FormicaRegistrar.t.sol
git commit -m "contracts: FormicaRegistrar claims a sovereign ENSv2 namespace per user

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin main
```

---
### Task 2: Fork test su Sepolia contro i contratti beta reali

Questo task chiude il rischio numero uno della spec: **quanto costa `claim` e se la beta si comporta come dice la documentazione**. Gira contro la Sepolia vera, in memoria, senza spendere ETH.

**Files:**
- Test: `contracts/test/fork/SepoliaEnsFork.t.sol`

**Interfaces:**
- Consumes: `FormicaRegistrar(address,address,address,address)`, `EnsSepolia.*`, `IPermissionedRegistry`, `IVerifiableFactory`, `IUserRegistryInit`, `IPermissionedResolver` dal Task 1.
- Produces: nessuna API nuova; produce la misura di gas del claim, che il Task 3 usa per decidere se spezzare la transazione.

- [ ] **Step 1: Scrivi il fork test**

`contracts/test/fork/SepoliaEnsFork.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {FormicaRegistrar} from "../../src/FormicaRegistrar.sol";
import {EnsSepolia} from "../../src/ens/EnsSepolia.sol";
import {
    IPermissionedRegistry,
    IVerifiableFactory,
    IUserRegistryInit,
    IPermissionedResolver
} from "../../src/ens/IEnsV2.sol";

/// @notice Gira contro i contratti ENSv2 beta reali su Sepolia. Salta se
/// SEPOLIA_RPC_URL non è impostata, come il fork test di Fuji in M0.
contract SepoliaEnsForkTest is Test {
    /// @dev owner di formica.eth (wallet demo).
    address internal constant FORMICA_OWNER = 0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f;
    /// @dev vault reale su Fuji, usato come valore del record addr.
    address internal constant FUJI_VAULT = 0x099c2Bc126E748241a77E186b342F8ABA1A642f5;

    bool internal forked;
    IPermissionedRegistry internal formicaRegistry;
    FormicaRegistrar internal registrar;
    address internal user = makeAddr("utenteEns");

    modifier onlyFork() {
        if (!forked) return;
        _;
    }

    function setUp() public {
        string memory rpc = vm.envOr("SEPOLIA_RPC_URL", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        forked = true;

        // 1. registry di formica.eth, root = owner del nome
        vm.prank(FORMICA_OWNER);
        address registryAddr = IVerifiableFactory(EnsSepolia.VERIFIABLE_FACTORY).deployProxy(
            EnsSepolia.USER_REGISTRY_IMPL,
            uint256(keccak256("formica-registry-fork")),
            abi.encodeCall(IUserRegistryInit.initialize, (FORMICA_OWNER, EnsSepolia.ALL_ROLES))
        );
        formicaRegistry = IPermissionedRegistry(registryAddr);

        // 2. aggancia formica.eth alla gerarchia
        vm.prank(FORMICA_OWNER);
        IPermissionedRegistry(EnsSepolia.ETH_REGISTRY).setSubregistry(
            uint256(keccak256(bytes("formica"))), registryAddr
        );

        // 3. il nostro registrar, 4. la delega del ruolo
        registrar = new FormicaRegistrar(
            registryAddr, EnsSepolia.VERIFIABLE_FACTORY, EnsSepolia.USER_REGISTRY_IMPL, EnsSepolia.RESOLVER_IMPL
        );
        vm.prank(FORMICA_OWNER);
        formicaRegistry.grantRootRoles(EnsSepolia.ROLE_REGISTRAR | EnsSepolia.ROLE_RENEW, address(registrar));
    }

    function test_fork_claim_attachesUserRegistryAndResolver() public onlyFork {
        vm.prank(user);
        (address userRegistry, address userResolver) = registrar.claim("mario");

        assertEq(formicaRegistry.getSubregistry("mario"), userRegistry, "subregistry agganciato");
        assertEq(formicaRegistry.getResolver("mario"), userResolver, "resolver agganciato");
        assertGt(userRegistry.code.length, 0, "proxy registry deployato");
        assertGt(userResolver.code.length, 0, "proxy resolver deployato");
    }

    function test_fork_claim_gasCost() public onlyFork {
        vm.prank(user);
        uint256 before = gasleft();
        registrar.claim("mario");
        uint256 used = before - gasleft();
        console.log("claim gas:", used);
        assertLt(used, 3_000_000, "claim deve stare in una tx ragionevole");
    }

    function test_fork_userIsRootOfOwnNamespace() public onlyFork {
        vm.prank(user);
        (address userRegistry, address userResolver) = registrar.claim("mario");

        // l'utente registra il nome del goal nel PROPRIO registry
        vm.prank(user);
        IPermissionedRegistry(userRegistry).register(
            "vacanza", user, address(0), userResolver, EnsSepolia.USER_NAME_ROLES, uint64(block.timestamp) + 365 days
        );
        assertEq(IPermissionedRegistry(userRegistry).getResolver("vacanza"), userResolver, "resolver del goal");

        // il registrar NON può registrare nomi nel namespace dell'utente
        vm.prank(address(registrar));
        vm.expectRevert();
        IPermissionedRegistry(userRegistry).register(
            "abusivo", address(registrar), address(0), userResolver, EnsSepolia.USER_NAME_ROLES, uint64(block.timestamp) + 365 days
        );
    }

    function test_fork_addrRecordPointsToFujiVault() public onlyFork {
        vm.prank(user);
        (address userRegistry, address userResolver) = registrar.claim("mario");
        vm.prank(user);
        IPermissionedRegistry(userRegistry).register(
            "vacanza", user, address(0), userResolver, EnsSepolia.USER_NAME_ROLES, uint64(block.timestamp) + 365 days
        );

        bytes32 node = _namehash("vacanza.mario.formica.eth");
        vm.prank(user);
        IPermissionedResolver(userResolver).setAddr(node, EnsSepolia.FUJI_COIN_TYPE, abi.encodePacked(FUJI_VAULT));

        bytes memory stored = IPermissionedResolver(userResolver).addr(node, EnsSepolia.FUJI_COIN_TYPE);
        assertEq(stored.length, 20, "20 byte di indirizzo");
        assertEq(address(bytes20(stored)), FUJI_VAULT, "il record punta al vault su Fuji");
    }

    function _namehash(string memory name) private pure returns (bytes32 node) {
        node = bytes32(0);
        bytes memory b = bytes(name);
        uint256 end = b.length;
        for (uint256 i = b.length; i > 0; i--) {
            if (b[i - 1] == ".") {
                node = keccak256(abi.encodePacked(node, keccak256(_sub(b, i, end))));
                end = i - 1;
            }
        }
        node = keccak256(abi.encodePacked(node, keccak256(_sub(b, 0, end))));
    }

    function _sub(bytes memory b, uint256 start, uint256 end) private pure returns (bytes memory out) {
        out = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            out[i - start] = b[i];
        }
    }
}
```

- [ ] **Step 2: Esegui il fork test**

Run: `cd contracts && set -a && . ./.env && set +a && ~/.foundry/bin/forge test --match-contract SepoliaEnsForkTest -vv`
Expected: 4 test PASS, e nel log compare `claim gas: <numero>`.

**Questo è il momento della verità del piano.** Se qualcosa fallisce:
- revert dentro `setSubregistry`: prova a passare il token id mascherato `0x58b969c8a4ae5cc5f401f8ddd0b98d3a0b6ac57adf71b32217a1361b00000000` al posto del labelhash puro; la doc dice che `anyId` accetta entrambi, la catena decide.
- revert dentro `register` o `initialize` con firma diversa: **fermati e segnala**. Le firme vanno rilette in `docs.ens.domains/llms-full.txt` (scaricalo con `curl -sL https://docs.ens.domains/llms-full.txt`), non indovinate. Riporta la firma trovata.
- `claim gas` sopra 3 milioni: segnala nel report, il Task 3 spezzerà il claim in due transazioni.

- [ ] **Step 3: Committa**

```bash
git add contracts/test/fork/SepoliaEnsFork.t.sol
git commit -m "contracts: fork test of the ENSv2 claim against the real Sepolia beta

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 3: Script di setup idempotente ed esecuzione reale su Sepolia

**Files:**
- Create: `contracts/script/SetupEns.s.sol`
- Create: `contracts/deployments/sepolia-ens.json` (prodotto dallo script, committato)
- Modify: `deployments/sepolia.md`

**Interfaces:**
- Consumes: `FormicaRegistrar`, `EnsSepolia`, le interfacce del Task 1; la misura di gas del Task 2.
- Produces: `deployments/sepolia-ens.json` con le chiavi `chainId`, `formicaRegistry`, `formicaRegistrar`, `ethRegistry`, `setupBlock`; è il file che il frontend legge per gli indirizzi.

- [ ] **Step 1: Scrivi lo script**

`contracts/script/SetupEns.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FormicaRegistrar} from "../src/FormicaRegistrar.sol";
import {EnsSepolia} from "../src/ens/EnsSepolia.sol";
import {IPermissionedRegistry, IVerifiableFactory, IUserRegistryInit} from "../src/ens/IEnsV2.sol";

/// @notice Setup una tantum di formica.eth su Sepolia. Idempotente: se
/// deployments/sepolia-ens.json esiste già, riusa gli indirizzi e salta i
/// passi fatti. Serve perché la beta ENSv2 può essere azzerata da ENS.
contract SetupEns is Script {
    function run() external {
        string memory path = "./deployments/sepolia-ens.json";
        address existingRegistry;
        address existingRegistrar;
        try vm.readFile(path) returns (string memory json) {
            existingRegistry = vm.parseJsonAddress(json, ".formicaRegistry");
            existingRegistrar = vm.parseJsonAddress(json, ".formicaRegistrar");
            console.log("stato esistente letto da", path);
        } catch {
            console.log("nessuno stato precedente, setup da zero");
        }

        vm.startBroadcast();

        address registryAddr = existingRegistry;
        if (registryAddr.code.length == 0) {
            registryAddr = IVerifiableFactory(EnsSepolia.VERIFIABLE_FACTORY).deployProxy(
                EnsSepolia.USER_REGISTRY_IMPL,
                uint256(keccak256("formica.eth/registry/v1")),
                abi.encodeCall(IUserRegistryInit.initialize, (msg.sender, EnsSepolia.ALL_ROLES))
            );
            console.log("UserRegistry di formica.eth:", registryAddr);
        }

        // Aggancia formica.eth: senza questo i nomi non risolvono.
        if (IPermissionedRegistry(EnsSepolia.ETH_REGISTRY).getSubregistry("formica") != registryAddr) {
            IPermissionedRegistry(EnsSepolia.ETH_REGISTRY).setSubregistry(
                uint256(keccak256(bytes("formica"))), registryAddr
            );
            console.log("formica.eth agganciato al registry");
        }

        address registrarAddr = existingRegistrar;
        if (registrarAddr.code.length == 0) {
            registrarAddr = address(
                new FormicaRegistrar(
                    registryAddr,
                    EnsSepolia.VERIFIABLE_FACTORY,
                    EnsSepolia.USER_REGISTRY_IMPL,
                    EnsSepolia.RESOLVER_IMPL
                )
            );
            console.log("FormicaRegistrar:", registrarAddr);
        }

        IPermissionedRegistry(registryAddr).grantRootRoles(
            EnsSepolia.ROLE_REGISTRAR | EnsSepolia.ROLE_RENEW, registrarAddr
        );
        console.log("ruoli delegati al registrar");

        vm.stopBroadcast();

        string memory out = "ens";
        vm.serializeUint(out, "chainId", EnsSepolia.CHAIN_ID);
        vm.serializeAddress(out, "ethRegistry", EnsSepolia.ETH_REGISTRY);
        vm.serializeAddress(out, "formicaRegistry", registryAddr);
        vm.serializeUint(out, "setupBlock", block.number);
        string memory json = vm.serializeAddress(out, "formicaRegistrar", registrarAddr);
        vm.writeJson(json, path);
        console.log("scritto", path);
    }
}
```

`grantRootRoles` si può richiamare senza danno: concede ruoli già concessi. Per questo non è dentro un `if`.

- [ ] **Step 2: Prova a vuoto, senza broadcast**

Run: `cd contracts && set -a && . ./.env && set +a && ~/.foundry/bin/forge script script/SetupEns.s.sol --rpc-url sepolia`
Expected: la simulazione passa e stampa il gas totale stimato. Converti il costo: `~/.foundry/bin/cast gas-price --rpc-url sepolia` moltiplicato per il gas stimato; il wallet ha circa 0,0098 ETH. Se il costo stimato supera 0,005 ETH, **fermati e segnala**: serve un faucet Sepolia prima di procedere.

- [ ] **Step 3: Esegui per davvero**

Run: `cd contracts && set -a && . ./.env && set +a && ~/.foundry/bin/forge script script/SetupEns.s.sol --rpc-url sepolia --broadcast`
Expected: quattro transazioni riuscite; `deployments/sepolia-ens.json` scritto.

- [ ] **Step 4: Verifica on-chain, non a schermo**

```bash
cd contracts && set -a && . ./.env && set +a
REG=$(jq -r .formicaRegistry deployments/sepolia-ens.json)
RAR=$(jq -r .formicaRegistrar deployments/sepolia-ens.json)
~/.foundry/bin/cast call 0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2 'getSubregistry(string)(address)' formica --rpc-url sepolia
~/.foundry/bin/cast code $RAR --rpc-url sepolia | wc -c
```
Expected: la prima chiamata stampa lo stesso indirizzo di `formicaRegistry`; la seconda un numero grande (il registrar ha codice).

- [ ] **Step 5: Aggiorna `deployments/sepolia.md`**

Aggiungi in coda al file una sezione con: indirizzo del registry di `formica.eth`, indirizzo di `FormicaRegistrar`, blocco e link Etherscan delle transazioni di setup, e la riga "il subregistry di formica.eth è impostato: i nomi risolvono". Togli dalla tabella la riga che dice che il subregistry non è impostato.

- [ ] **Step 6: Committa**

```bash
git add contracts/script/SetupEns.s.sol contracts/deployments/sepolia-ens.json contracts/broadcast/SetupEns.s.sol deployments/sepolia.md
git commit -m "contracts: ENSv2 setup for formica.eth on Sepolia, registrar authorized

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin main
```

---
### Task 4: Il frontend risolve un nome e verifica che sia un goal Formica

Il flusso che diventa "per nome" è **Incassa**: si versa un'entrata a `vacanza.mario.formica.eth` invece che a un indirizzo. La dashboard e il checkout restano invariati in questo task.

**Files:**
- Create: `frontend/src/config/ens.ts`, `frontend/src/hooks/useEnsGoal.ts`
- Modify: `frontend/src/pages/Receive.tsx`

**Interfaces:**
- Consumes: `deployments/sepolia-ens.json` del Task 3 (gli indirizzi vanno copiati in `config/ens.ts`), `FACTORY`/`USDC`/`ROUTER` da `config/addresses.ts`, `useTx` da `lib/tx.ts`.
- Produces: `useGoalTarget(input: string)` che ritorna `{ kind: 'address' | 'name' | 'empty', vault?: Address, name?: string, isLoading: boolean, error?: string }`; costanti `ENS_SEPOLIA`, `FUJI_COIN_TYPE`, `FORMICA_REGISTRAR`, `FORMICA_REGISTRY`, `ensRegistrarAbi`, `ensRegistryAbi`, `ensResolverAbi`, `USER_NAME_ROLES`.

- [ ] **Step 1: Scrivi la configurazione ENS**

`frontend/src/config/ens.ts`:

```ts
import { parseAbi, type Address } from 'viem'

// contracts/deployments/sepolia-ens.json (setup 2026-09-12) — aggiorna qui se
// la beta ENSv2 viene azzerata e si rifà il setup.
export const SEPOLIA_CHAIN_ID = 11155111
export const ETH_REGISTRY: Address = '0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2'
export const UNIVERSAL_RESOLVER: Address = '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe'
export const FORMICA_REGISTRY: Address = '0x0000000000000000000000000000000000000000' // ← da sepolia-ens.json
export const FORMICA_REGISTRAR: Address = '0x0000000000000000000000000000000000000000' // ← da sepolia-ens.json
export const FORMICA_ROOT = 'formica.eth'

/** ENSIP-11: 0x80000000 | 43113 (Avalanche Fuji). */
export const FUJI_COIN_TYPE = 2147526761

/** ROLE_SET_SUBREGISTRY | ROLE_SET_RESOLVER | ROLE_RENEW, più i rispettivi admin. */
export const USER_NAME_ROLES =
  (1n << 20n) | (1n << 24n) | (1n << 16n) | (1n << 148n) | (1n << 152n) | (1n << 144n)

export const ensRegistrarAbi = parseAbi([
  'function claim(string label) returns (address registry, address resolver)',
  'function labelOf(address owner) view returns (string)',
  'event Claimed(string label, address indexed owner, address registry, address resolver)',
])

export const ensRegistryAbi = parseAbi([
  'function register(string label, address owner, address subregistry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)',
  'function getSubregistry(string label) view returns (address)',
  'function getResolver(string label) view returns (address)',
])

export const ensResolverAbi = parseAbi([
  'function setAddr(bytes32 node, uint256 coinType, bytes value)',
  'function addr(bytes32 node, uint256 coinType) view returns (bytes)',
])

export const ENS_EXPLORER = 'https://explorer.ens.dev/name/'
```

Gli indirizzi `FORMICA_REGISTRY` e `FORMICA_REGISTRAR` vanno presi da `contracts/deployments/sepolia-ens.json` prodotto dal Task 3: `jq -r .formicaRegistry contracts/deployments/sepolia-ens.json`. Se sono ancora a zero, il task non è finito.

- [ ] **Step 2: Scrivi l'hook di risoluzione**

`frontend/src/hooks/useEnsGoal.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { isAddress, type Address } from 'viem'
import { normalize } from 'viem/ens'
import { usePublicClient, useReadContract } from 'wagmi'
import { factoryAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'
import { FUJI_COIN_TYPE, SEPOLIA_CHAIN_ID, UNIVERSAL_RESOLVER } from '../config/ens'

export type GoalTarget = {
  kind: 'empty' | 'address' | 'name'
  vault?: Address
  name?: string
  isLoading: boolean
  error?: string
}

/**
 * Accetta un indirizzo o un nome ENS. Sul nome: risolve su Sepolia il record
 * addr del coinType di Fuji, poi verifica su Fuji che l'indirizzo sia un vault
 * della nostra factory — un nome può puntare ovunque.
 */
export function useGoalTarget(input: string): GoalTarget {
  const trimmed = input.trim()
  const sepolia = usePublicClient({ chainId: SEPOLIA_CHAIN_ID })
  const looksLikeName = trimmed.includes('.')

  const resolution = useQuery({
    queryKey: ['ens-goal', trimmed],
    enabled: looksLikeName && Boolean(sepolia),
    staleTime: 30_000,
    queryFn: async (): Promise<Address | null> => {
      if (!sepolia) return null
      const address = await sepolia.getEnsAddress({
        name: normalize(trimmed),
        coinType: FUJI_COIN_TYPE,
        universalResolverAddress: UNIVERSAL_RESOLVER,
      })
      return (address as Address | null) ?? null
    },
  })

  const candidate: Address | undefined = looksLikeName
    ? (resolution.data ?? undefined)
    : isAddress(trimmed)
      ? (trimmed as Address)
      : undefined

  const isVault = useReadContract({
    address: FACTORY,
    abi: factoryAbi,
    functionName: 'isVault',
    args: candidate ? [candidate] : undefined,
    query: { enabled: Boolean(candidate) },
  })

  if (trimmed === '') return { kind: 'empty', isLoading: false }

  const isLoading = (looksLikeName && resolution.isLoading) || isVault.isLoading
  const kind = looksLikeName ? 'name' : 'address'

  if (looksLikeName && resolution.isError) {
    return { kind, isLoading: false, error: 'Nome non risolvibile su Sepolia' }
  }
  if (looksLikeName && !resolution.isLoading && !resolution.data) {
    return { kind, isLoading: false, error: 'Questo nome non ha un indirizzo su Fuji' }
  }
  if (!looksLikeName && !isAddress(trimmed)) {
    return { kind, isLoading: false, error: 'Indirizzo non valido' }
  }
  if (candidate && isVault.data === false) {
    return { kind, vault: candidate, isLoading: false, error: 'Non è un goal Formica' }
  }

  return { kind, vault: candidate, name: looksLikeName ? trimmed : undefined, isLoading }
}
```

- [ ] **Step 3: Usa l'hook nella pagina Incassa**

In `frontend/src/pages/Receive.tsx`: sostituisci la validazione locale dell'indirizzo (`vaultValid`, `isAddress`, la `useReadContract` di `isVault`) con `const target = useGoalTarget(vaultInput)` e usa `target.vault` dove prima c'era `vault`. Aggiorna: l'etichetta del campo diventa `Nome ENS o indirizzo del goal`, il placeholder `vacanza.mario.formica.eth`, e sotto il campo compare `target.error` in rosso oppure, quando `target.kind === 'name'` e `target.vault` esiste, la riga grigia `<nome> → <indirizzo accorciato>` che mostra la risoluzione avvenuta. `canSend` richiede `target.vault !== undefined && !target.error`.

- [ ] **Step 4: Verifica il build e la risoluzione**

Run: `cd frontend && pnpm build`
Expected: build e typecheck verdi.

Run (prova reale della risoluzione, prima ancora che esista un nome — deve tornare `null` e non un errore):
```bash
cd frontend && node -e "
const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');
const c = createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') });
c.getEnsAddress({ name: 'vacanza.mario.formica.eth', coinType: 2147526761, universalResolverAddress: '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe' }).then(r => console.log('risolto:', r)).catch(e => console.log('errore:', e.shortMessage || e.message));
"
```
Expected: `risolto: null` finché il nome non esiste. Un errore di tipo "reverted" indica che l'indirizzo dello Universal Resolver è sbagliato: fermati e segnalalo.

- [ ] **Step 5: Committa**

```bash
git add frontend/src/config/ens.ts frontend/src/hooks/useEnsGoal.ts frontend/src/pages/Receive.tsx
git commit -m "frontend: pay a goal by its ENSv2 name, verified against the Fuji factory

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 5: Pagina Nomi — claim del namespace e nome del goal

**Files:**
- Modify: `frontend/src/lib/tx.ts` (supporto a una catena diversa da Fuji)
- Create: `frontend/src/pages/Names.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/components/Header.tsx`, `frontend/src/lib/hashRoute.ts` (rotta `/names`)

**Interfaces:**
- Consumes: tutto il Task 4; `useUserGoals`, `useVaultLabels` da `hooks/useGoals.ts`.
- Produces: la rotta `#/names`; nessuna API consumata da altri task.

- [ ] **Step 1: Fai accettare a `useTx` una catena diversa**

In `frontend/src/lib/tx.ts`: `useTx(chainId?: number)`. Passa `chainId` a `usePublicClient({ chainId })`, e nella `run` aggiungi `chainId` ai parametri di `writeContract`. **Le fee minime valgono solo su Fuji**: se `chainId` è diverso da 43113, non passare `maxFeePerGas`/`maxPriorityFeePerGas` e lascia stimare al wallet, perché su Sepolia la base fee è nell'ordine dei gwei e un tetto di 2000 wei farebbe fallire ogni transazione.

- [ ] **Step 2: Scrivi la pagina**

`frontend/src/pages/Names.tsx` con tre blocchi in sequenza:

1. **Stato del namespace.** Legge `FORMICA_REGISTRAR.labelOf(account)`. Se vuoto, mostra un campo per la label con la stessa validazione del contratto (`^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$`), l'anteprima `mario.formica.eth`, e il pulsante "Reclama il tuo namespace" che chiama `claim(label)` su Sepolia. Se pieno, mostra `<label>.formica.eth` con il link a `ENS_EXPLORER`.
2. **Indirizzi del namespace.** Con la label nota, legge `FORMICA_REGISTRY.getSubregistry(label)` e `getResolver(label)` e li mostra: sono il registry e il resolver **dell'utente**, con la frase "sei tu la radice di questo namespace: Formica non può modificarlo".
3. **Nomi dei goal.** Per ogni goal dell'utente (da `useUserGoals` + `useVaultLabels` su Fuji) una riga con il nome del vault e un pulsante "Dai un nome" che esegue due transazioni in sequenza su Sepolia:
   - `registryUtente.register(labelGoal, account, zeroAddress, resolverUtente, USER_NAME_ROLES, BigInt(Math.floor(Date.now()/1000) + 365*24*3600))`
   - `resolverUtente.setAddr(namehash(`${labelGoal}.${labelUtente}.formica.eth`), BigInt(FUJI_COIN_TYPE), encodePacked(['address'], [vault]))`
   Dopo la seconda, mostra il nome completo e il link all'explorer.

`namehash` ed `encodePacked` si importano da `viem/ens` e `viem`. Ogni transazione ha il suo `useTx(SEPOLIA_CHAIN_ID)` e il suo `<TxStatus/>`, come nelle pagine esistenti.

**La catena.** L'app vive su Fuji e queste transazioni sono su Sepolia: prima di ciascuna, se `connection.chainId !== SEPOLIA_CHAIN_ID`, mostra un pulsante "Passa a Sepolia" che chiama `switchChain({ chainId: SEPOLIA_CHAIN_ID })` e disabilita le azioni finché il cambio non è avvenuto. Alla fine, un pulsante "Torna a Fuji". Il `ChainGuard` attuale blocca tutta l'app fuori da Fuji: **la rotta `/names` va esclusa dal guard** in `App.tsx`, altrimenti la pagina diventa irraggiungibile appena si cambia catena.

- [ ] **Step 3: Mostra il nome nel dettaglio del goal**

In `frontend/src/pages/GoalDetail.tsx`: se l'utente ha un namespace (`labelOf` non vuota) e il goal ha una label, costruisci `<labelGoal>.<labelUtente>.formica.eth`, risolvilo con l'hook del Task 4 e, **solo se risolve all'indirizzo di questo vault**, mostralo sotto il titolo come link a `ENS_EXPLORER`. Se non risolve, non mostrare nulla: un nome scritto ma non registrato sarebbe una dichiarazione falsa.

- [ ] **Step 4: Aggiungi la rotta**

In `hashRoute.ts` aggiungi `names` alle rotte riconosciute; in `Header.tsx` la voce "Nomi"; in `App.tsx` il ramo `route.name === 'names' && <Names />`, **fuori** da `<ChainGuard>`.

- [ ] **Step 5: Build e prova a mano**

Run: `cd frontend && pnpm build` → verde.
Poi, con il server `pnpm dev`: reclama un namespace con il wallet saver, dai il nome a un goal, e verifica la risoluzione dal terminale:

```bash
cd frontend && node -e "
const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');
const c = createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') });
c.getEnsAddress({ name: process.argv[1], coinType: 2147526761, universalResolverAddress: '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe' }).then(r => console.log('risolto:', r));
" vacanza.mario.formica.eth
```
Expected: stampa l'indirizzo del vault su Fuji. **Questa è la prova che M2 funziona**: un nome su Sepolia che restituisce un contratto su Avalanche.

- [ ] **Step 6: Committa**

```bash
git add frontend/src/pages/Names.tsx frontend/src/pages/GoalDetail.tsx frontend/src/App.tsx frontend/src/components/Header.tsx frontend/src/lib/hashRoute.ts frontend/src/lib/tx.ts
git commit -m "frontend: claim an ENSv2 namespace and name each goal

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 6: Documentazione onesta e checklist della prova

**Files:**
- Modify: `README.md`, `deployments/sepolia.md`
- Create: `docs/e2e-m2.md`

**Interfaces:**
- Consumes: gli indirizzi del Task 3 e i nomi creati nel Task 5.
- Produces: niente codice.

- [ ] **Step 1: Aggiorna il README**

Nella sezione **Status** sposta "ENSv2 goal names" da "In progress" a "Live", **solo per ciò che è stato davvero eseguito**, con: indirizzo di `FormicaRegistrar` su Sepolia con link Etherscan, un nome di esempio funzionante, e una riga che spiega la gerarchia in una frase. Aggiungi la nota che ENS può azzerare i nomi della beta Sepolia a ogni redeploy.

- [ ] **Step 2: Scrivi `docs/e2e-m2.md`**

Stessa forma di `docs/e2e-m1.md`: tabella con colonne `# | Passo | Atteso | Esito | Tx`, con i passi: reclamo del namespace; namespace già reclamato che deve fallire; label non valida rifiutata dalla UI; nome dato a un goal; risoluzione del nome dal terminale; incasso scrivendo il nome nella pagina Incassa; nome inesistente che mostra l'errore; nome che punta a un indirizzo non-vault che mostra "Non è un goal Formica". **Le caselle si spuntano solo dopo aver osservato il passo**, mai leggendo il codice.

- [ ] **Step 3: Committa**

```bash
git add README.md deployments/sepolia.md docs/e2e-m2.md
git commit -m "docs: M2 status, ENS addresses and E2E checklist

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push origin main
```

---

## Ordine, tempi e taglio

| Task | Tempo stimato | Se salta |
|---|---|---|
| 1 contratti + unit test | 45 min | niente M2 |
| 2 fork test su Sepolia | 30 min | si procede al buio: **non saltare** |
| 3 setup reale | 20 min | niente nomi on-chain |
| 4 risoluzione nel checkout | 30 min | **è il cuore della demo**: non saltare |
| 5 pagina Nomi | 60 min | ripiego: i nomi si creano da `cast`, la demo mostra la risoluzione |
| 6 documentazione | 20 min | perdi punti su onestà e leggibilità |

**Regola di taglio:** se alle 18:00 i Task 1–4 non sono verdi, si ferma M2 al punto in cui è, si aggiorna il README con ciò che funziona davvero e si passa alla demo. Un flusso stretto che gira batte un flusso largo a metà.
