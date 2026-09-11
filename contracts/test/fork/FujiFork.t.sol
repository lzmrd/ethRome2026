// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GoalVault} from "../../src/GoalVault.sol";
import {GoalVaultFactory} from "../../src/GoalVaultFactory.sol";
import {PaymentRouter} from "../../src/PaymentRouter.sol";
import {IPool} from "../../src/interfaces/IPool.sol";
import {FujiAddresses} from "../../src/FujiAddresses.sol";

contract FujiForkTest is Test {
    IERC20 constant USDC = IERC20(FujiAddresses.USDC);
    IERC20 constant AUSDC = IERC20(FujiAddresses.AUSDC);

    bool forked;
    GoalVaultFactory factory;
    PaymentRouter router;
    address alice = makeAddr("alice");
    address merchant = makeAddr("merchant");

    modifier onlyFork() {
        if (!forked) vm.skip(true);
        _;
    }

    function setUp() public {
        string memory rpc = vm.envOr("FUJI_RPC_URL", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        forked = true;
        factory = new GoalVaultFactory(USDC, IPool(FujiAddresses.POOL), AUSDC);
        router = new PaymentRouter(factory);
        _fund(alice, 10e6);
        vm.prank(alice);
        USDC.approve(address(router), type(uint256).max);
    }

    function _fund(address to, uint256 amount) internal {
        vm.prank(FujiAddresses.AUSDC); // the aToken holds the pool's idle USDC
        USDC.transfer(to, amount);
    }

    function test_fork_roundUpIntoYieldGoal_earnsAndRedeems() public onlyFork {
        vm.prank(alice);
        GoalVault vault = GoalVault(factory.createGoal("vacanza", GoalVault.Mode.YIELD, 1, 100e6));

        vm.prank(alice);
        uint256 saving = router.payWithRoundUp(merchant, 4.3e6, address(vault));
        assertEq(saving, 0.7e6);
        assertEq(USDC.balanceOf(merchant), 4.3e6);

        uint256 aBefore = AUSDC.balanceOf(address(vault));
        assertApproxEqAbs(aBefore, 0.7e6, 1);

        vm.warp(block.timestamp + 30 days);
        uint256 aAfter = AUSDC.balanceOf(address(vault));
        assertGt(aAfter, aBefore); // real Aave interest, tiny at testnet rates

        uint256 usdcBefore = USDC.balanceOf(alice);
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        uint256 out = vault.redeem(shares, alice, alice);
        assertGe(out, 0.7e6 - 1);
        assertEq(USDC.balanceOf(alice), usdcBefore + out);
        assertLe(vault.totalAssets(), 2); // ERC-4626 virtual-share + Aave rounding dust
    }

    function test_fork_partialWithdraw_leavesRestInAave() public onlyFork {
        vm.prank(alice);
        GoalVault vault = GoalVault(factory.createGoal("moto", GoalVault.Mode.YIELD, 1, 0));
        vm.startPrank(alice);
        USDC.approve(address(vault), 1e6);
        vault.deposit(1e6, alice);
        uint256 usdcBefore = USDC.balanceOf(alice);
        vault.withdraw(0.3e6, alice, alice);
        vm.stopPrank();

        assertApproxEqAbs(AUSDC.balanceOf(address(vault)), 0.7e6, 2);
        assertEq(USDC.balanceOf(alice), usdcBefore + 0.3e6);
        assertEq(vault.netDeposited(), 0.7e6);
    }

    function test_fork_setModeMigratesThroughAave() public onlyFork {
        vm.prank(alice);
        GoalVault vault = GoalVault(factory.createGoal("bici", GoalVault.Mode.LIQUID, 1, 0));
        vm.startPrank(alice);
        USDC.approve(address(vault), 1e6);
        vault.deposit(1e6, alice);
        vault.setMode(GoalVault.Mode.YIELD);
        vm.stopPrank();
        assertApproxEqAbs(AUSDC.balanceOf(address(vault)), 1e6, 1);
        assertEq(USDC.balanceOf(address(vault)), 0);

        vm.prank(alice);
        vault.setMode(GoalVault.Mode.LIQUID);
        assertEq(AUSDC.balanceOf(address(vault)), 0);
        assertApproxEqAbs(USDC.balanceOf(address(vault)), 1e6, 1);
    }

    function test_fork_receiveWithRoundDownIntoYieldGoal() public onlyFork {
        vm.prank(alice);
        GoalVault vault = GoalVault(factory.createGoal("casa", GoalVault.Mode.YIELD, 3, 0));
        address employer = makeAddr("employer");
        _fund(employer, 5e6);
        vm.startPrank(employer);
        USDC.approve(address(router), type(uint256).max);
        uint256 saving = router.receiveWithRoundDown(4.3e6, address(vault));
        vm.stopPrank();
        assertEq(saving, 0.9e6);
        assertApproxEqAbs(AUSDC.balanceOf(address(vault)), 0.9e6, 1);
    }
}
