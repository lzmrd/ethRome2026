# ETHRome 2026

Built during [ETHRome 2026](https://ethrome.org) (Urbe Hub, Rome, 11–13 September 2026).

**Formica** — round up your spending (and down your income) into named savings goals. Each goal is an ERC-4626 vault with an ENSv2 subname; funds earn yield on Aave and stay non-custodial.

Work in progress. Payments are simulated in-app with testnet USDC; no real funds. Aave V3 runs on Avalanche Fuji testnet (yield at the testnet rate).

## Contracts (Avalanche Fuji, chain 43113)

| Contract | Address |
|---|---|
| GoalVaultFactory | [`0x46a1bE569353A64C0e1B8F117334573C2d694A2b`](https://testnet.snowtrace.io/address/0x46a1bE569353A64C0e1B8F117334573C2d694A2b) |
| PaymentRouter | [`0xca61e25E841FB780617aEf78945E7F937b623D5a`](https://testnet.snowtrace.io/address/0xca61e25E841FB780617aEf78945E7F937b623D5a) |
| USDC (Circle) | [`0x5425890298aed601595a70AB815c96711a31Bc65`](https://testnet.snowtrace.io/address/0x5425890298aed601595a70AB815c96711a31Bc65) |
| Aave V3 Pool | [`0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40`](https://testnet.snowtrace.io/address/0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40) |

## Develop

```bash
cd contracts
cp .env.example .env   # fill in burner testnet keys
forge test             # unit tests + Fuji fork tests (when FUJI_RPC_URL is set)
forge script script/Deploy.s.sol --rpc-url fuji --broadcast
```

## License

[MIT](LICENSE)
