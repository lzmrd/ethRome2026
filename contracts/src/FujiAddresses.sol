// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Avalanche Fuji addresses, verified on-chain on 2026-09-11 (bgd-labs/aave-address-book AaveV3Fuji).
library FujiAddresses {
    uint256 internal constant CHAIN_ID = 43113;
    address internal constant POOL = 0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40;
    address internal constant USDC = 0x5425890298aed601595a70AB815c96711a31Bc65; // Circle USDC, 6 decimals
    address internal constant AUSDC = 0x9CFcc1B289E59FBe1E769f020C77315DF8473760;
}
