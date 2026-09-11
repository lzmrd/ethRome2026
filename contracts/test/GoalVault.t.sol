// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {GoalVault} from "../src/GoalVault.sol";
import {IPool} from "../src/interfaces/IPool.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockPool} from "./mocks/MockPool.sol";

contract GoalVaultTest is Test {
    MockERC20 usdc;
    MockERC20 aUsdc;
    MockPool pool;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        aUsdc = new MockERC20("Aave USDC", "aUSDC", 6);
        pool = new MockPool(usdc, aUsdc);
        usdc.mint(alice, 1_000e6);
        usdc.mint(bob, 1_000e6);
    }

    function _vault(GoalVault.Mode mode) internal returns (GoalVault v) {
        v = new GoalVault(usdc, IPool(address(pool)), aUsdc, alice, "vacanza", mode, 3, 500e6);
        vm.prank(alice);
        usdc.approve(address(v), type(uint256).max);
    }

    function _deposit(GoalVault v, uint256 amount) internal {
        vm.prank(alice);
        v.deposit(amount, alice);
    }

    // --- constructor ---

    function test_constructor_setsParams() public {
        GoalVault v = _vault(GoalVault.Mode.YIELD);
        assertEq(v.owner(), alice);
        assertEq(v.label(), "vacanza");
        assertEq(uint8(v.mode()), uint8(GoalVault.Mode.YIELD));
        assertEq(v.multiplier(), 3);
        assertEq(v.target(), 500e6);
        assertEq(v.asset(), address(usdc));
        assertEq(v.decimals(), 6);
        assertEq(v.name(), "Formica Goal vacanza");
    }

    function test_constructor_revertsOnMultiplierZero() public {
        vm.expectRevert(abi.encodeWithSelector(GoalVault.InvalidMultiplier.selector, 0));
        new GoalVault(usdc, IPool(address(pool)), aUsdc, alice, "x", GoalVault.Mode.LIQUID, 0, 0);
    }

    function test_constructor_revertsOnMultiplierAboveMax() public {
        vm.expectRevert(abi.encodeWithSelector(GoalVault.InvalidMultiplier.selector, 11));
        new GoalVault(usdc, IPool(address(pool)), aUsdc, alice, "x", GoalVault.Mode.LIQUID, 11, 0);
    }

    function test_constructor_revertsOnEmptyLabel() public {
        vm.expectRevert(GoalVault.EmptyLabel.selector);
        new GoalVault(usdc, IPool(address(pool)), aUsdc, alice, "", GoalVault.Mode.LIQUID, 1, 0);
    }

    // --- deposits ---

    function test_liquidDeposit_keepsAssetsIdle() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        _deposit(v, 100e6);
        assertEq(usdc.balanceOf(address(v)), 100e6);
        assertEq(aUsdc.balanceOf(address(v)), 0);
        assertEq(v.totalAssets(), 100e6);
        assertEq(v.maxWithdraw(alice), 100e6);
    }

    function test_yieldDeposit_suppliesToPool() public {
        GoalVault v = _vault(GoalVault.Mode.YIELD);
        _deposit(v, 100e6);
        assertEq(usdc.balanceOf(address(v)), 0);
        assertEq(aUsdc.balanceOf(address(v)), 100e6);
        assertEq(v.totalAssets(), 100e6);
    }

    function test_depositForOwnerFromThirdParty_allowed() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        vm.startPrank(bob);
        usdc.approve(address(v), 10e6);
        v.deposit(10e6, alice); // gift to the owner: allowed
        vm.stopPrank();
        assertEq(v.maxWithdraw(alice), 10e6);
        assertEq(v.balanceOf(bob), 0);
    }

    function test_depositToNonOwnerReceiver_reverts() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        vm.startPrank(bob);
        usdc.approve(address(v), 10e6);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxDeposit.selector, bob, 10e6, 0));
        v.deposit(10e6, bob);
        vm.stopPrank();
    }

    function test_mintToNonOwnerReceiver_reverts() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        vm.startPrank(bob);
        usdc.approve(address(v), 10e6);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxMint.selector, bob, 10e6, 0));
        v.mint(10e6, bob);
        vm.stopPrank();
    }

    // --- yield and withdrawals ---

    function test_accrual_raisesRedeemableAssets() public {
        GoalVault v = _vault(GoalVault.Mode.YIELD);
        _deposit(v, 100e6);
        pool.accrue(address(v), 10e6);
        assertEq(v.totalAssets(), 110e6);
        uint256 shares = v.balanceOf(alice);
        vm.prank(alice);
        uint256 out = v.redeem(shares, alice, alice);
        assertApproxEqAbs(out, 110e6, 1);
        assertEq(v.balanceOf(alice), 0);
    }

    function test_redeemAll_fromYield_emptiesPoolPosition() public {
        GoalVault v = _vault(GoalVault.Mode.YIELD);
        _deposit(v, 100e6);
        uint256 shares = v.balanceOf(alice);
        vm.prank(alice);
        v.redeem(shares, alice, alice);
        assertEq(usdc.balanceOf(alice), 1_000e6);
        assertEq(aUsdc.balanceOf(address(v)), 0);
    }

    function test_partialWithdraw_usesIdleFirstThenPool() public {
        GoalVault v = _vault(GoalVault.Mode.YIELD);
        _deposit(v, 100e6); // 100 in the pool
        vm.prank(alice);
        v.setMode(GoalVault.Mode.LIQUID); // 100 back idle
        vm.prank(alice);
        v.setMode(GoalVault.Mode.YIELD); // 100 in the pool again
        usdc.mint(address(v), 20e6); // 20 idle (donation)
        vm.prank(alice);
        v.withdraw(50e6, alice, alice); // 20 idle + 30 from the pool
        assertEq(usdc.balanceOf(address(v)), 0);
        assertEq(aUsdc.balanceOf(address(v)), 70e6);
    }

    // --- owner settings ---

    function test_setMode_migratesBothWays() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        _deposit(v, 100e6);
        vm.prank(alice);
        v.setMode(GoalVault.Mode.YIELD);
        assertEq(aUsdc.balanceOf(address(v)), 100e6);
        assertEq(usdc.balanceOf(address(v)), 0);
        vm.prank(alice);
        v.setMode(GoalVault.Mode.LIQUID);
        assertEq(aUsdc.balanceOf(address(v)), 0);
        assertEq(usdc.balanceOf(address(v)), 100e6);
        assertEq(uint8(v.mode()), uint8(GoalVault.Mode.LIQUID));
    }

    function test_setMode_emptyVault_noPoolCalls() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        vm.prank(alice);
        v.setMode(GoalVault.Mode.YIELD); // would revert in the pool if it supplied 0
        assertEq(uint8(v.mode()), uint8(GoalVault.Mode.YIELD));
    }

    function test_setMode_onlyOwner() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        v.setMode(GoalVault.Mode.YIELD);
    }

    function test_setMultiplier_boundsAndOwner() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        vm.prank(alice);
        v.setMultiplier(10);
        assertEq(v.multiplier(), 10);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GoalVault.InvalidMultiplier.selector, 11));
        v.setMultiplier(11);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        v.setMultiplier(2);
    }

    function test_setTarget_onlyOwner() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        vm.prank(alice);
        v.setTarget(1_000e6);
        assertEq(v.target(), 1_000e6);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        v.setTarget(1);
    }

    // --- netDeposited ---

    function test_netDeposited_tracksDeposit_liquid() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        _deposit(v, 100e6);
        assertEq(v.netDeposited(), 100e6);
    }

    function test_netDeposited_tracksDeposit_yield() public {
        GoalVault v = _vault(GoalVault.Mode.YIELD);
        _deposit(v, 100e6);
        assertEq(v.netDeposited(), 100e6);
    }

    function test_netDeposited_tracksPartialWithdraw() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        _deposit(v, 100e6);
        vm.prank(alice);
        v.withdraw(40e6, alice, alice);
        assertEq(v.netDeposited(), 60e6);
    }

    function test_netDeposited_flooredAtZero_afterAccrueAndFullRedeem() public {
        GoalVault v = _vault(GoalVault.Mode.YIELD);
        _deposit(v, 100e6);
        pool.accrue(address(v), 10e6); // redeem pulls out more than netDeposited
        uint256 shares = v.balanceOf(alice);
        vm.prank(alice);
        v.redeem(shares, alice, alice);
        assertEq(v.netDeposited(), 0);
    }

    // --- fixed ownership ---

    function test_renounceOwnership_alwaysReverts() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        vm.prank(alice); // even the owner
        vm.expectRevert(GoalVault.OwnershipFixed.selector);
        v.renounceOwnership();
    }

    function test_transferOwnership_alwaysReverts() public {
        GoalVault v = _vault(GoalVault.Mode.LIQUID);
        vm.prank(alice); // even the owner
        vm.expectRevert(GoalVault.OwnershipFixed.selector);
        v.transferOwnership(bob);
    }
}
