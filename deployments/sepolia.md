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
| Subregistry | [`0x9dE5F9cd978caB5fb07717e6014131E9E1f0D651`](https://sepolia.etherscan.io/address/0x9dE5F9cd978caB5fb07717e6014131E9E1f0D651) — impostato dal setup M2 il 2026-09-12: il subregistry di formica.eth è impostato e i nomi risolvono |

The registration was relayed (sponsored) by the ENS beta app, so the transaction was sent by `0x46565eEdB0BB948ae787dd105ccE300F736dA28E`, not by the owner wallet. Ownership is verifiable on-chain:

```bash
cast call 0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2 'ownerOf(uint256)(address)' \
  0x58b969c8a4ae5cc5f401f8ddd0b98d3a0b6ac57adf71b32217a1361b00000000 --rpc-url sepolia
# -> 0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f
```

## M2 setup (2026-09-12, block 11688629)

Il namespace è pronto: `FormicaRegistrar` è autorizzato sul registry di `formica.eth` e ogni utente che chiama `claim(label)` ottiene `<label>.formica.eth` con registry e resolver propri, di cui è root. Gli indirizzi sono in [`contracts/deployments/sepolia-ens.json`](../contracts/deployments/sepolia-ens.json).

| Cosa | Indirizzo |
|---|---|
| UserRegistry di `formica.eth` | [`0x9dE5F9cd978caB5fb07717e6014131E9E1f0D651`](https://sepolia.etherscan.io/address/0x9dE5F9cd978caB5fb07717e6014131E9E1f0D651) |
| FormicaRegistrar | [`0xe31c0b4AF6F1c8F8b7279e6AfdD6bD178799E5f3`](https://sepolia.etherscan.io/address/0xe31c0b4AF6F1c8F8b7279e6AfdD6bD178799E5f3) |

Transazioni di setup:

| Passo | Tx |
|---|---|
| Deploy del registry di `formica.eth` | [`0x7ee8336f…9064670`](https://sepolia.etherscan.io/tx/0x7ee8336f491817f3c586deaa716756beda95782a175101e156d54f6199064670) |
| `setSubregistry(formica)` | [`0x335aae07…63743bb`](https://sepolia.etherscan.io/tx/0x335aae07ce010846fb2bf31faa9fe795927b7941364a52199829c5d1863743bb) |
| Deploy di `FormicaRegistrar` | [`0x74f0b2bb…2a803ab`](https://sepolia.etherscan.io/tx/0x74f0b2bb1e18c1c98fc2b80b77a147fc3bea603f036ec02d35d758dee2a803ab) |
| `grantRootRoles(ROLE_REGISTRAR\|ROLE_RENEW)` | [`0xbfcd1e21…b4580e2`](https://sepolia.etherscan.io/tx/0xbfcd1e212ba1c73a09de5c73807d18560ec627b7dafb1e31f5151b3a5b4580e2) |

Verifica: il subregistry di `formica.eth` è impostato: i nomi risolvono. `FormicaRegistrar` detiene `ROLE_REGISTRAR | ROLE_RENEW` sul root del registry; il wallet è root con `ALL_ROLES`.

Nomi creati nella prova E2E del 2026-09-12:

| Nome | Cosa | Tx |
|---|---|---|
| `mario.formica.eth` | claim del namespace (registry utente `0xfBF53d0b…F0000D`, resolver `0x9fC28e21…FbCf3d`) | [`0x0c3813a8…9025d5`](https://sepolia.etherscan.io/tx/0x0c3813a8ecd2248c2092f3a3a3b02f178b8a8a3d8ef277f53e035774019025d5) |
| `vacanza-indonesia.mario.formica.eth` | registrazione nel registry utente | [`0x51baa822…9db750`](https://sepolia.etherscan.io/tx/0x51baa822b08c21b52df248590cceefa2beb4b719f66627607986e92d259db750) |
| `vacanza-indonesia.mario.formica.eth` | record `addr(2147526761)` | [`0x8baa8dde…957be1`](https://sepolia.etherscan.io/tx/0x8baa8ddef4f8f4e9d9cca85b5b378094a2acec95818d26cb08ad09e3b7957be1) |
| `summer-holiday.mario.formica.eth` | registrazione nel registry utente | [`0x4c314155…a8e575`](https://sepolia.etherscan.io/tx/0x4c31415555af5d671b6cf53cd52f2d3018cfb9827ac18642f93ae2fb74a8e575) |
| `summer-holiday.mario.formica.eth` | record `addr(2147526761)` | [`0xffe47b68…d7de97`](https://sepolia.etherscan.io/tx/0xffe47b683fe17fdd232d4f82c8461a00c200bf030fca61f17a337988bdd7de97) |

Entrambi risolvono via Universal Resolver al rispettivo `GoalVault` su Avalanche Fuji:
`vacanza-indonesia…` → `0x099c2Bc126E748241a77E186b342F8ABA1A642f5`, `summer-holiday…` → `0x1618094A5fC624061a1112ef3ec262fdCBB73CAc` (quello della demo, creato il 2026-09-12).

## ENSv2 beta contracts used (Sepolia)

Verified to have code at these addresses on 2026-09-12; source: [ENS deployments](https://docs.ens.domains/learn/deployments).

| Contract | Address |
|---|---|
| ETHRegistry | [`0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2`](https://sepolia.etherscan.io/address/0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2) |
| ETHRegistrar | [`0xa88553f454b77203b0d036a05c894d555eaaa2cc`](https://sepolia.etherscan.io/address/0xa88553f454b77203b0d036a05c894d555eaaa2cc) |

The app never hardcodes a name: it reads the owner, resolver and subregistry from these contracts.

> ENSv2 is in beta. ENS warns that names registered on Sepolia may be reset when they redeploy the beta contracts (last redeploy: 30 July 2026). If that happens during the hackathon, re-register the name and update this file.
