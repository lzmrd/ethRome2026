# ETHRome 2026

Built during [ETHRome 2026](https://ethrome.org) (Urbe Hub, Rome, 11–13 September 2026).

**Formica** — round up your spending (and down your income) into named savings goals. Each goal is an ERC-4626 vault with an ENSv2 subname; funds earn yield on Aave and stay non-custodial.

Work in progress. Payments are simulated with testnet USDC; no real funds. Aave V3 runs on Avalanche Fuji testnet (yield at the testnet rate).

**Status**
- **Live on Fuji:** factory, router, owner-only ERC-4626 goal vaults (only the owner can receive deposits into their goal), LIQUID/YIELD mode backed by the real Aave V3 pool. Smoke test passed: [createGoal](https://testnet.snowtrace.io/tx/0xbd00a211a70a47c6f1a0ad5810849ec33a4b854ccb62774e3f99751767fbf2f6), [payWithRoundUp](https://testnet.snowtrace.io/tx/0x4ff0df5291c96373830bc2488defebc3644f5b232b2f996126d3f75d80b31666).
- **Live on Sepolia (ENSv2 beta):** goal names. `FormicaRegistrar` [`0xe31c0b4A…799E5f3`](https://sepolia.etherscan.io/address/0xe31c0b4AF6F1c8F8b7279e6AfdD6bD178799E5f3) holds a delegated role on `formica.eth`: one transaction gives a user `<user>.formica.eth` with their own registry and resolver, of which they are root. A goal name `<goal>.<user>.formica.eth` resolves to the `GoalVault` on Fuji — verified end to end: `vacanza-indonesia.mario.formica.eth` → `0x099c2Bc126E748241a77E186b342F8ABA1A642f5`. ENS may reset names on the Sepolia beta at every redeploy; `contracts/script/SetupEns.s.sol` is idempotent.
- **Live on Swarm (M4):** every movement in a goal's history can carry a private context (shop, category, note), encrypted on a Swarm feed with a key derived from the user's Swarm ID identity. The feed manifest is published in the `formica.ledger` text record of `<user>.formica.eth` (Sepolia), so the ledger is discoverable from the name. Verified end to end: a note written in one browser came back in a *different* browser signed in to the same Swarm ID identity — no shared local state, the data returned from the feed. The on-chain record holds the manifest, and a public gateway outside the app resolves the feed and returns 4104 opaque bytes: the note never appears in clear ([`docs/e2e-m4.md`](docs/e2e-m4.md) has the commands to reproduce it). Known limit: the ledger keys derive from the app's origin, so a ledger written on one origin is not visible from another.
- **Web app:** dashboard, create goal, spend checkout, receive income and withdraw on Fuji, all walked through by hand ([`docs/e2e-m1.md`](docs/e2e-m1.md)). Names page — claim a namespace, name each goal, and pay by typing a name: the names were created from the page itself and resolve on-chain, two checks are still open ([`docs/e2e-m2.md`](docs/e2e-m2.md)). Private ledger — encrypted context on each movement of a goal's history, and the feed manifest published into the name ([`docs/e2e-m4.md`](docs/e2e-m4.md)).

## Contracts (Avalanche Fuji, chain 43113)

| Contract | Address |
|---|---|
| GoalVaultFactory | [`0xC3D34b01581137Baf4e0e332E9b4cC2755aB84C4`](https://testnet.snowtrace.io/address/0xC3D34b01581137Baf4e0e332E9b4cC2755aB84C4) |
| PaymentRouter | [`0x901421967256d1eB181902Db7A24f07428791ed9`](https://testnet.snowtrace.io/address/0x901421967256d1eB181902Db7A24f07428791ed9) |
| USDC (Circle) | [`0x5425890298aed601595a70AB815c96711a31Bc65`](https://testnet.snowtrace.io/address/0x5425890298aed601595a70AB815c96711a31Bc65) |
| Aave V3 Pool | [`0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40`](https://testnet.snowtrace.io/address/0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40) |

## Web app (Fuji)

```bash
cd frontend
pnpm install
cp .env.example .env.local   # opzionale: VITE_DEMO_MERCHANT=0x… per il checkout demo
pnpm dev
```

Funzioni M1 (tutte su Fuji, tx reali): dashboard dei goal, creazione goal, checkout con round-up, incasso con round-down, dettaglio con withdraw e storico. M2: dalla pagina Nomi si reclama il proprio namespace ENSv2 su Sepolia e si dà un nome a ogni goal; nella pagina Incassa si può scrivere il nome al posto dell'indirizzo. Verifiche E2E: [`docs/e2e-m1.md`](docs/e2e-m1.md) e [`docs/e2e-m2.md`](docs/e2e-m2.md).

## Develop

```bash
cd contracts
cp .env.example .env   # fill in burner testnet keys
forge test             # unit tests + Fuji fork tests (when FUJI_RPC_URL is set)
forge script script/Deploy.s.sol --rpc-url fuji --broadcast
```

## License

[MIT](LICENSE)
