// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockPool} from "./mocks/MockPool.sol";

contract MockPoolTest is Test {
    MockERC20 usdc;
    MockERC20 aUsdc;
    MockPool pool;
    address user = makeAddr("user");

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        aUsdc = new MockERC20("Aave USDC", "aUSDC", 6);
        pool = new MockPool(usdc, aUsdc);
        usdc.mint(user, 100e6);
        vm.prank(user);
        usdc.approve(address(pool), type(uint256).max);
    }

    function test_supplyMintsATokensToBeneficiary() public {
        vm.prank(user);
        pool.supply(address(usdc), 40e6, user, 0);
        assertEq(aUsdc.balanceOf(user), 40e6);
        assertEq(usdc.balanceOf(address(pool)), 40e6);
    }

    function test_withdrawBurnsCallerATokens() public {
        vm.startPrank(user);
        pool.supply(address(usdc), 40e6, user, 0);
        pool.withdraw(address(usdc), 15e6, user);
        vm.stopPrank();
        assertEq(aUsdc.balanceOf(user), 25e6);
        assertEq(usdc.balanceOf(user), 75e6);
    }

    function test_withdrawMaxTakesFullBalance() public {
        vm.startPrank(user);
        pool.supply(address(usdc), 40e6, user, 0);
        uint256 out = pool.withdraw(address(usdc), type(uint256).max, user);
        vm.stopPrank();
        assertEq(out, 40e6);
        assertEq(aUsdc.balanceOf(user), 0);
    }

    function test_accrueSimulatesInterest() public {
        vm.prank(user);
        pool.supply(address(usdc), 40e6, user, 0);
        pool.accrue(user, 2e6);
        vm.prank(user);
        pool.withdraw(address(usdc), type(uint256).max, user);
        assertEq(usdc.balanceOf(user), 102e6);
    }

    function test_supplyZeroReverts() public {
        vm.prank(user);
        vm.expectRevert(bytes("INVALID_AMOUNT"));
        pool.supply(address(usdc), 0, user, 0);
    }
}
