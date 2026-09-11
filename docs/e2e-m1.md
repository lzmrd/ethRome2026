# Formica — Checklist E2E M1 (Fuji, frontend core)

Data verifica: ______ · Wallet saver: ______ · Wallet merchant: ______

| # | Passo | Atteso | Esito | Tx |
|---|---|---|---|---|
| 1 | Connetti saver su Fuji | dashboard con i goal esistenti, APY Aave live | ☐ | — |
| 2 | Crea goal `m1-<data>` x3 Yield target 20 | naviga al dettaglio, evento GoalCreated | ☐ | |
| 3 | Spendi 4.30 verso merchant | merchant 4.30, goal +2.10, una sola tx PaymentRounded | ☐ | |
| 4 | Spendi 5.00 verso merchant | risparmio 0, merchant 5.00 | ☐ | |
| 5 | Connetti merchant, incassa 104.30 sul vault del saver | saver +103.40, goal +0.90, una sola tx IncomeRounded | ☐ | |
| 6 | Incassa 0.50 | risparmio 0, destinatario +0.50 | ☐ | |
| 7 | Dettaglio goal | saldo = maxWithdraw, yield ≥ 0, APY live, storico Deposit/Withdraw | ☐ | — |
| 8 | Preleva 1.00 | USDC indietro, saldo goal −1.00, evento Withdraw | ☐ | |
| 9 | Preleva tutto | saldo 0.00, yield mostrato 0 (non ~2), nessuna share residua | ☐ | — |
| 10 | Errore guidato: spendi oltre il saldo | pulsante disabilitato con motivo, nessuna tx | ☐ | — |

Note: __________________________________________
