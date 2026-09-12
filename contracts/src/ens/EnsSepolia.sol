// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Indirizzi della beta ENSv2 su Sepolia e costanti dei ruoli.
library EnsSepolia {
    uint256 internal constant CHAIN_ID = 11155111;

    address internal constant ETH_REGISTRY = 0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2;
    address internal constant VERIFIABLE_FACTORY = 0x10dC6333CDFe1FCEf624c6e0a8221b91804Cd7ef;
    address internal constant USER_REGISTRY_IMPL = 0x624a25d67B59D587752EbEc8DdeD8827dAe52050;
    address internal constant RESOLVER_IMPL = 0x9EAe5C2730a7dD16BDD1DeE6421a1B91e3B0365e;
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
