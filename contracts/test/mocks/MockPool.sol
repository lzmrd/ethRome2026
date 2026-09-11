// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPool} from "../../src/interfaces/IPool.sol";
import {MockERC20} from "./MockERC20.sol";

/// @notice 1:1 stand-in for the Aave V3 Pool. Like Aave, supply(0) reverts and withdraw(max) takes the full balance.
contract MockPool is IPool {
    MockERC20 public immutable underlying;
    MockERC20 public immutable aToken;

    constructor(MockERC20 underlying_, MockERC20 aToken_) {
        underlying = underlying_;
        aToken = aToken_;
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        require(asset == address(underlying), "UNKNOWN_ASSET");
        require(amount > 0, "INVALID_AMOUNT");
        underlying.transferFrom(msg.sender, address(this), amount);
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        require(asset == address(underlying), "UNKNOWN_ASSET");
        uint256 balance = aToken.balanceOf(msg.sender);
        if (amount == type(uint256).max) amount = balance;
        require(amount > 0 && amount <= balance, "INVALID_AMOUNT");
        aToken.burn(msg.sender, amount);
        underlying.transfer(to, amount);
        return amount;
    }

    /// @notice Test helper: simulates interest by minting aTokens backed by fresh underlying.
    function accrue(address user, uint256 amount) external {
        underlying.mint(address(this), amount);
        aToken.mint(user, amount);
    }
}
