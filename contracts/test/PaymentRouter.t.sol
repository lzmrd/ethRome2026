// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GoalVault} from "../src/GoalVault.sol";
import {GoalVaultFactory} from "../src/GoalVaultFactory.sol";
import {PaymentRouter} from "../src/PaymentRouter.sol";
import {IPool} from "../src/interfaces/IPool.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockPool} from "./mocks/MockPool.sol";

contract PaymentRouterTest is Test {
    event PaymentRounded(address indexed payer, address indexed merchant, uint256 amount, uint256 saving, address vault);
    event IncomeRounded(address indexed payer, address indexed recipient, uint256 amount, uint256 saving, address vault);

    MockERC20 usdc;
    MockERC20 aUsdc;
    MockPool pool;
    GoalVaultFactory factory;
    PaymentRouter router;
    GoalVault vault; // alice's goal, x3, LIQUID
    address alice = makeAddr("alice"); // saver
    address bob = makeAddr("bob"); // employer / third party
    address merchant = makeAddr("merchant");

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        aUsdc = new MockERC20("Aave USDC", "aUSDC", 6);
        pool = new MockPool(usdc, aUsdc);
        factory = new GoalVaultFactory(usdc, IPool(address(pool)), aUsdc);
        router = new PaymentRouter(factory);

        vm.prank(alice);
        vault = GoalVault(factory.createGoal("vacanza", GoalVault.Mode.LIQUID, 3, 500e6));

        usdc.mint(alice, 1_000e6);
        usdc.mint(bob, 1_000e6);
        vm.prank(alice);
        usdc.approve(address(router), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(router), type(uint256).max);
    }

    // --- math (spec §5.4) ---

    function test_quoteRoundUp_table() public view {
        assertEq(router.quoteRoundUp(5e6, 3), 0); // already round
        assertEq(router.quoteRoundUp(0.01e6, 1), 0.99e6);
        assertEq(router.quoteRoundUp(4.3e6, 3), 2.1e6); // coffee example
        assertEq(router.quoteRoundUp(1.99e6, 10), 0.1e6);
        assertEq(router.quoteRoundUp(4.3e6, 1), 0.7e6);
        assertEq(router.quoteRoundUp(4.3e6, 10), 7e6);
    }

    function test_quoteRoundDown_table() public view {
        assertEq(router.quoteRoundDown(104.3e6, 3), 0.9e6); // salary example
        assertEq(router.quoteRoundDown(7e6, 3), 0); // already round
        assertEq(router.quoteRoundDown(0.5e6, 5), 0); // below 1 USDC: no saving
        assertEq(router.quoteRoundDown(1.99e6, 10), 1e6); // capped at the integer part
        assertEq(router.quoteRoundDown(104.3e6, 1), 0.3e6);
    }

    // --- payWithRoundUp ---

    function test_payWithRoundUp_splitsMerchantAndSaving() public {
        vm.prank(alice);
        uint256 saving = router.payWithRoundUp(merchant, 4.3e6, address(vault));
        assertEq(saving, 2.1e6);
        assertEq(usdc.balanceOf(merchant), 4.3e6);
        assertEq(usdc.balanceOf(alice), 1_000e6 - 6.4e6);
        assertEq(vault.totalAssets(), 2.1e6);
        assertEq(vault.maxWithdraw(alice), 2.1e6);
        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(vault.netDeposited(), 2.1e6);
    }

    function test_payWithRoundUp_roundAmount_noSaving() public {
        vm.prank(alice);
        uint256 saving = router.payWithRoundUp(merchant, 5e6, address(vault));
        assertEq(saving, 0);
        assertEq(usdc.balanceOf(merchant), 5e6);
        assertEq(vault.totalAssets(), 0);
    }

    function test_payWithRoundUp_yieldVault_suppliesToPool() public {
        vm.prank(alice);
        vault.setMode(GoalVault.Mode.YIELD);
        vm.prank(alice);
        router.payWithRoundUp(merchant, 4.3e6, address(vault));
        assertEq(aUsdc.balanceOf(address(vault)), 2.1e6);
    }

    function test_payWithRoundUp_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit PaymentRounded(alice, merchant, 4.3e6, 2.1e6, address(vault));
        vm.prank(alice);
        router.payWithRoundUp(merchant, 4.3e6, address(vault));
    }

    function test_payWithRoundUp_revertsOnUnknownVault() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PaymentRouter.UnknownVault.selector, address(0xBEEF)));
        router.payWithRoundUp(merchant, 4.3e6, address(0xBEEF));
    }

    function test_payWithRoundUp_revertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(PaymentRouter.ZeroAmount.selector);
        router.payWithRoundUp(merchant, 0, address(vault));
    }

    function test_payWithRoundUp_revertsIntoSomeoneElsesGoal() public {
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PaymentRouter.NotVaultOwner.selector, address(vault), bob));
        router.payWithRoundUp(merchant, 4.3e6, address(vault));
    }

    function test_payWithRoundUp_revertsWithoutAllowance() public {
        vm.prank(alice);
        usdc.approve(address(router), 0);
        vm.prank(alice);
        vm.expectRevert();
        router.payWithRoundUp(merchant, 4.3e6, address(vault));
    }

    // --- receiveWithRoundDown ---

    function test_receiveWithRoundDown_splitsRecipientAndSaving() public {
        vm.prank(bob);
        uint256 saving = router.receiveWithRoundDown(104.3e6, address(vault));
        assertEq(saving, 0.9e6);
        assertEq(usdc.balanceOf(alice), 1_000e6 + 103.4e6);
        assertEq(usdc.balanceOf(bob), 1_000e6 - 104.3e6);
        assertEq(vault.maxWithdraw(alice), 0.9e6);
        assertEq(vault.balanceOf(bob), 0);
        assertEq(vault.netDeposited(), 0.9e6);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    function test_receiveWithRoundDown_cappedAtIntegerPart() public {
        vm.prank(alice);
        vault.setMultiplier(10);
        vm.prank(bob);
        uint256 saving = router.receiveWithRoundDown(1.99e6, address(vault));
        assertEq(saving, 1e6);
        assertEq(usdc.balanceOf(alice), 1_000e6 + 0.99e6);
    }

    function test_receiveWithRoundDown_subUnit_noSaving() public {
        vm.prank(bob);
        uint256 saving = router.receiveWithRoundDown(0.5e6, address(vault));
        assertEq(saving, 0);
        assertEq(usdc.balanceOf(alice), 1_000e6 + 0.5e6);
        assertEq(vault.totalAssets(), 0);
    }

    function test_receiveWithRoundDown_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit IncomeRounded(bob, alice, 104.3e6, 0.9e6, address(vault));
        vm.prank(bob);
        router.receiveWithRoundDown(104.3e6, address(vault));
    }

    function test_receiveWithRoundDown_revertsOnUnknownVault() public {
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PaymentRouter.UnknownVault.selector, address(0xBEEF)));
        router.receiveWithRoundDown(104.3e6, address(0xBEEF));
    }

    function test_receiveWithRoundDown_revertsOnZeroAmount() public {
        vm.prank(bob);
        vm.expectRevert(PaymentRouter.ZeroAmount.selector);
        router.receiveWithRoundDown(0, address(vault));
    }
}
