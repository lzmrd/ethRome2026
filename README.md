# ETHRome 2026

Built during [ETHRome 2026](https://ethrome.org) (Urbe Hub, Rome, 11–13 September 2026).

**Formica** — round up your spending (and down your income) into named savings goals. Each goal is an ERC-4626 vault with an ENSv2 subname; funds earn yield on Aave and stay non-custodial.

Work in progress. Payments are simulated with testnet USDC; no real funds. Aave V3 runs on Avalanche Fuji testnet (yield at the testnet rate).

**Status**
- **Live on Fuji:** factory, router, owner-only ERC-4626 goal vaults (only the owner can receive deposits into their goal), LIQUID/YIELD mode backed by the real Aave V3 pool. Smoke test passed: [createGoal](https://testnet.snowtrace.io/tx/0xbd00a211a70a47c6f1a0ad5810849ec33a4b854ccb62774e3f99751767fbf2f6), [payWithRoundUp](https://testnet.snowtrace.io/tx/0x4ff0df5291c96373830bc2488defebc3644f5b232b2f996126d3f75d80b31666).
- **In progress:** ENSv2 goal names (M2). Web app M1: dashboard, crea goal, checkout, incasso, withdraw su Fuji.

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

Funzioni M1 (tutte su Fuji, tx reali): dashboard dei goal, creazione goal, checkout con round-up, incasso con round-down, dettaglio con withdraw e storico. Nomi ENSv2 in arrivo (M2). Verifica E2E: checklist in [`docs/e2e-m1.md`](docs/e2e-m1.md), esito da compilare.

## Develop

```bash
cd contracts
cp .env.example .env   # fill in burner testnet keys
forge test             # unit tests + Fuji fork tests (when FUJI_RPC_URL is set)
forge script script/Deploy.s.sol --rpc-url fuji --broadcast
```

## License

[MIT](LICENSE)
