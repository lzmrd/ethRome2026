// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GoalVault} from "../src/GoalVault.sol";
import {GoalVaultFactory} from "../src/GoalVaultFactory.sol";
import {IPool} from "../src/interfaces/IPool.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockPool} from "./mocks/MockPool.sol";

contract GoalVaultFactoryTest is Test {
    event GoalCreated(address indexed owner, address indexed vault, string label);

    MockERC20 usdc;
    MockERC20 aUsdc;
    MockPool pool;
    GoalVaultFactory factory;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        aUsdc = new MockERC20("Aave USDC", "aUSDC", 6);
        pool = new MockPool(usdc, aUsdc);
        factory = new GoalVaultFactory(usdc, IPool(address(pool)), aUsdc);
    }

    function test_createGoal_deploysVaultOwnedByCaller() public {
        vm.prank(alice);
        address vault = factory.createGoal("vacanza", GoalVault.Mode.YIELD, 3, 500e6);
        GoalVault v = GoalVault(vault);
        assertEq(v.owner(), alice);
        assertEq(v.label(), "vacanza");
        assertEq(uint8(v.mode()), uint8(GoalVault.Mode.YIELD));
        assertEq(v.multiplier(), 3);
        assertEq(v.target(), 500e6);
        assertEq(v.asset(), address(usdc));
        assertEq(address(v.POOL()), address(pool));
        assertEq(address(v.A_TOKEN()), address(aUsdc));
        assertTrue(factory.isVault(vault));
    }

    function test_goalsOf_listsPerOwnerInOrder() public {
        vm.startPrank(alice);
        address a1 = factory.createGoal("vacanza", GoalVault.Mode.LIQUID, 1, 0);
        address a2 = factory.createGoal("bici", GoalVault.Mode.YIELD, 2, 0);
        vm.stopPrank();
        vm.prank(bob);
        address b1 = factory.createGoal("auto", GoalVault.Mode.LIQUID, 1, 0);

        address[] memory aliceGoals = factory.goalsOf(alice);
        assertEq(aliceGoals.length, 2);
        assertEq(aliceGoals[0], a1);
        assertEq(aliceGoals[1], a2);
        address[] memory bobGoals = factory.goalsOf(bob);
        assertEq(bobGoals.length, 1);
        assertEq(bobGoals[0], b1);
        assertEq(factory.goalsOf(makeAddr("nobody")).length, 0);
    }

    function test_createGoal_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit GoalCreated(alice, address(0), "vacanza");
        vm.prank(alice);
        factory.createGoal("vacanza", GoalVault.Mode.LIQUID, 1, 0);
    }

    function test_isVault_falseForUnknown() public view {
        assertFalse(factory.isVault(address(0xBEEF)));
    }

    function test_createGoal_revertsOnInvalidMultiplier() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GoalVault.InvalidMultiplier.selector, 0));
        factory.createGoal("x", GoalVault.Mode.LIQUID, 0, 0);
    }
}
