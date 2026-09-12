# Formica — Checklist E2E M1 (Fuji, frontend core)

Data verifica: 2026-09-12 · Wallet saver: `0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f` · Wallet merchant: `0x1e6Ef1aB73838B4d1E3e596c462c83d1144C2785`

Eseguita a mano dal browser (MetaMask su Avalanche Fuji) contro i contratti in `contracts/deployments/fuji.json`. Ogni esito è verificato on-chain, non solo a schermo.

| # | Passo | Atteso | Esito | Tx |
|---|---|---|---|---|
| 1 | Connetti saver su Fuji | dashboard con i goal esistenti, APY Aave live | ✅ APY 0,13% letto da `getReserveData` | — |
| 2 | Crea goal `vacanza-indonesia` x4 Yield target 20 | naviga al dettaglio, evento GoalCreated | ✅ vault [`0x099c2Bc1…A642f5`](https://testnet.snowtrace.io/address/0x099c2Bc126E748241a77E186b342F8ABA1A642f5), `isVault` true | [`0x66c72cdf…8ee99e`](https://testnet.snowtrace.io/tx/0x66c72cdf504d70e79424b1478e32bc053a041f519a49454d01c8195c4b8ee99e) |
| 3 | Spendi 4.30 verso merchant | merchant 4.30, risparmio nel goal, una sola tx | ✅ x4 → risparmio 2,80 · (prima prova su goal x1 → 0,70: [`0x9465f0f1…eb9d0e`](https://testnet.snowtrace.io/tx/0x9465f0f18f130fecb6aff90c5b574e1513c2551d63d0a9eb7b088b41dfeb9d0e)) | [`0xe45fd545…ea8b99`](https://testnet.snowtrace.io/tx/0xe45fd545152d1e2054e1bd492d2d49c638ef914c3fcdde60c1b33ad1c8ea8b99) |
| 4 | Spendi 5.00 verso merchant | risparmio 0, merchant 5.00 | ✅ `saving = 0` nell'evento PaymentRounded | [`0xf7dd121c…54e2e4`](https://testnet.snowtrace.io/tx/0xf7dd121cb6f0389fea3e00d33b5ae59a6647f59f3373da3e92bc88b3ef54e2e4) |
| 5 | Connetti merchant, incassa 4.30 sul vault del saver | saver +3.40, goal +0.90, una sola tx IncomeRounded | ☐ da fare | |
| 6 | Incassa 0.50 | risparmio 0, destinatario +0.50 | ☐ da fare | |
| 7 | Dettaglio goal | saldo = maxWithdraw, yield ≥ 0, APY live, storico Deposit/Withdraw | ✅ storico e link Snowtrace corretti | — |
| 8 | Preleva 1.00 | USDC indietro, saldo goal −1.00, evento Withdraw | ✅ | [`0xc7184acb…c30a81`](https://testnet.snowtrace.io/tx/0xc7184acb2fd9f13fe865a80b681d18b6f62f6a1c18b46919e51a0a86bdc30a81) |
| 9 | Preleva tutto | saldo 0.00, yield mostrato 0 (non ~2), nessuna share residua | ✅ `totalAssets` 0, `netDeposited` 0, share 0, aUSDC 0 | [`0x91e77bca…085e98`](https://testnet.snowtrace.io/tx/0x91e77bcaa8eab6c0f5adafd7f3e7c1e71691aab1c4066768a7174c5955085e98) |
| 10 | Errore guidato: spendi oltre il saldo | pulsante disabilitato con motivo, nessuna tx | ☐ da fare | — |

**Fondi su Aave, verificato on-chain:** il goal `smoke` (x1, modalità Yield) tiene 0,70 USDC come aUSDC `0x9CFcc1B2…73760`, cioè il risparmio è davvero depositato nel pool di Aave V3 e matura al tasso testnet.

**Gas:** MetaMask rispetta le fee passate dall'app. L'approve USDC ([`0xb8e77c11…956f84`](https://testnet.snowtrace.io/tx/0xb8e77c11d30708c20a73ef2aba35248e8a3e7c2b9b7f073d1dc6491043956f84)) è stato minato a **11 wei per gas**: l'intera sessione di test è costata meno di 0,00000002 AVAX.
