# Formica — Checklist E2E M2 (ENSv2, Sepolia → Fuji)

Data verifica: 2026-09-12 · Wallet saver: `0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f` · Namespace: `mario.formica.eth` · Vault di prova su Fuji: `0x099c2Bc126E748241a77E186b342F8ABA1A642f5` (`vacanza-indonesia`)

Gli indirizzi dei contratti ENSv2 di Formica sono in [`contracts/deployments/sepolia-ens.json`](../contracts/deployments/sepolia-ens.json) e in [`deployments/sepolia.md`](sepolia.md). Ogni esito è verificato on-chain, non solo a schermo. Le caselle si spuntano solo dopo aver osservato il passo.

| # | Passo | Atteso | Esito | Tx |
|---|---|---|---|---|
| 1 | Reclama il namespace `mario` (`FormicaRegistrar.claim`) | registry e resolver dell'utente, owner = wallet, ruolo `REGISTRAR\|RENEW` al registrar | ✅ registry [`0xfBF53d0b…F0000D`](https://sepolia.etherscan.io/address/0xfbf53d0be5e2589a692786aa7e7c71b70ef0000d), resolver [`0x9fC28e21…FbCf3d`](https://sepolia.etherscan.io/address/0x9fc28e217716af2c37d6c2b2cbc34fa7e8fbcf3d), 526.964 gas | [`0x0c3813a8…9025d5`](https://sepolia.etherscan.io/tx/0x0c3813a8ecd2248c2092f3a3a3b02f178b8a8a3d8ef277f53e035774019025d5) |
| 2 | Reclama di nuovo lo stesso namespace | revert `AlreadyClaimed()` (`0x646cf558`) | ✅ revert osservato con `cast call` | — |
| 3 | Label non valida (maiuscole, punti, trattino in testa) rifiutata dalla UI | pulsante disabilitato, nessuna tx | ⬜ da cliccare a mano (la validazione del contratto è coperta dagli unit test) | — |
| 4 | Dai un nome al goal dalla pagina Nomi | due tx (register nel registry utente + record addr), poi il nome compare | ✅ **dalla UI**: `smoke.mario.formica.eth` creato con [`0x390eccd5…4f907`](https://sepolia.etherscan.io/tx/0x390eccd5) e [`0x5a2c7197…351a9`](https://sepolia.etherscan.io/tx/0x5a2c7197), risolve on-chain a `0x002cf99a…e529`. Prima registrazione (`vacanza-indonesia`) fatta da script, 168.738 gas | [`0x51baa822…9db750`](https://sepolia.etherscan.io/tx/0x51baa822b08c21b52df248590cceefa2beb4b719f66627607986e92d259db750) |
| 5 | Scrivi il record `addr(coinType 2147526761)` verso il vault Fuji | record di 20 byte sul resolver dell'utente | ✅ 63.016 gas | [`0x8baa8dde…957be1`](https://sepolia.etherscan.io/tx/0x8baa8ddef4f8f4e9d9cca85b5b378094a2acec95818d26cb08ad09e3b7957be1) |
| 6 | Risolvi `vacanza-indonesia.mario.formica.eth` dal terminale (Universal Resolver Sepolia) | indirizzo del vault su Fuji | ✅ `0x099c2bc126e748241a77e186b342f8aba1a642f5` | — |
| 7 | Incassa scrivendo il nome nella pagina Incassa | risoluzione mostrata, poi `receiveWithRoundDown` sul vault | ⚠️ parziale: il nome ha risolto e la tx è passata, ma con importo tondo 3,00 e pagante = destinatario, quindi risparmio 0 e saldi invariati. Da rifare dal wallet merchant con 4,30 | [`0x2e266d1c…f8c9b`](https://testnet.snowtrace.io/tx/0x2e266d1ccdb74da6fa43e951bff979d7ba1d63dade37a48eadd30b3c411f8c9b) |
| 8 | Nome inesistente nella pagina Incassa | errore "Questo nome non ha un indirizzo su Fuji", nessuna tx | ✅ osservato a schermo, nessuna tx inviata | — |
| 9 | Indirizzo che non è un vault | errore "Non è un goal Formica" (`factory.isVault` = false) | ✅ osservato a schermo con l'indirizzo del merchant | — |
| 10 | Dettaglio goal: il nome compare solo se risolve davvero a quel vault | link all'ENS Explorer | ⬜ da cliccare a mano (la risoluzione a `0x099c…` è verificata al passo 6) | — |

**Come sono state fatte le transazioni 1, 4 e 5:** da script e `cast`, non cliccando la pagina Nomi. La prima prova a mano della pagina ha trovato un difetto — la registrazione veniva inviata al resolver invece che al registry dell'utente — corretto il 2026-09-12; la chiamata corretta è stata simulata con successo sul registry `0xfBF53d0b…F0000D`. I passi 3, 7, 8, 9 e 10 restano da cliccare.

**Prova provata on-chain:** un nome registrato su Sepolia risolve a un contratto su Avalanche Fuji, e la factory di Fuji conferma che quell'indirizzo è un `GoalVault` (`isVault` = true). Il registrar non trattiene ruoli nel namespace dell'utente: il secondo claim dello stesso wallet è respinto dal contratto, e il fork test verifica che il registrar non possa registrare nomi nel registry dell'utente.

**Nota beta:** ENS può azzerare i nomi della beta Sepolia a ogni redeploy dei contratti. In quel caso si rilancia `contracts/script/SetupEns.s.sol` (idempotente) e si rifanno i passi 1–5.
