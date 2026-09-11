# ENSv2 on Sepolia

Names for Formica live on the **ENSv2 beta deployment on Sepolia**. Money stays on Avalanche Fuji (see [`contracts/deployments/fuji.json`](../contracts/deployments/fuji.json)).

## Registered name

| | |
|---|---|
| Name | **formica.eth** |
| Owner | `0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f` (demo wallet) |
| Registered | 2026-09-12 00:08 CEST, block 11684738 |
| Registration tx | [`0x453aba262b6207b7afb5b1519d3119eddb774003cbe95e521ac0be8482cad963`](https://sepolia.etherscan.io/tx/0x453aba262b6207b7afb5b1519d3119eddb774003cbe95e521ac0be8482cad963) |
| Expiry | 1820722116 (2027-09-12) |
| Token id in ETHRegistry | `0x58b969c8a4ae5cc5f401f8ddd0b98d3a0b6ac57adf71b32217a1361b00000000` (labelhash of `formica`, low 32 bits cleared) |
| Resolver | `0x2f2E8141554B966156934958eC380E6881a22Fd5` |
| Subregistry | not set yet — M2 installs `FormicaRegistrar` here, so each user gets `<user>.formica.eth` and each goal a `<goal>.<user>.formica.eth` subname |

The registration was relayed (sponsored) by the ENS beta app, so the transaction was sent by `0x46565eEdB0BB948ae787dd105ccE300F736dA28E`, not by the owner wallet. Ownership is verifiable on-chain:

```bash
cast call 0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2 'ownerOf(uint256)(address)' \
  0x58b969c8a4ae5cc5f401f8ddd0b98d3a0b6ac57adf71b32217a1361b00000000 --rpc-url sepolia
# -> 0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f
```

## ENSv2 beta contracts used (Sepolia)

Verified to have code at these addresses on 2026-09-12; source: [ENS deployments](https://docs.ens.domains/learn/deployments).

| Contract | Address |
|---|---|
| ETHRegistry | [`0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2`](https://sepolia.etherscan.io/address/0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2) |
| ETHRegistrar | [`0xa88553f454b77203b0d036a05c894d555eaaa2cc`](https://sepolia.etherscan.io/address/0xa88553f454b77203b0d036a05c894d555eaaa2cc) |

The app never hardcodes a name: it reads the owner, resolver and subregistry from these contracts.

> ENSv2 is in beta. ENS warns that names registered on Sepolia may be reset when they redeploy the beta contracts (last redeploy: 30 July 2026). If that happens during the hackathon, re-register the name and update this file.
