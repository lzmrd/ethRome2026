// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GoalVault} from "../src/GoalVault.sol";
import {GoalVaultFactory} from "../src/GoalVaultFactory.sol";
import {PaymentRouter} from "../src/PaymentRouter.sol";
import {FujiAddresses} from "../src/FujiAddresses.sol";

contract Smoke is Script {
    function run() external {
        require(block.chainid == FujiAddresses.CHAIN_ID, "not Fuji");
        string memory json = vm.readFile("./deployments/fuji.json");
        GoalVaultFactory factory = GoalVaultFactory(vm.parseJsonAddress(json, ".factory"));
        PaymentRouter router = PaymentRouter(vm.parseJsonAddress(json, ".router"));
        IERC20 usdc = IERC20(FujiAddresses.USDC);
        IERC20 aUsdc = IERC20(FujiAddresses.AUSDC);

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address saver = vm.addr(pk);
        uint256 usdcStart = usdc.balanceOf(saver);
        require(usdcStart >= 1e6, "saver needs >= 1 USDC (faucet.circle.com)");

        vm.startBroadcast(pk);
        GoalVault vault = GoalVault(factory.createGoal("smoke", GoalVault.Mode.YIELD, 1, 10e6));
        usdc.approve(address(router), 1e6);
        uint256 saving = router.payWithRoundUp(saver, 0.3e6, address(vault));
        vm.stopBroadcast();

        uint256 aBalance = aUsdc.balanceOf(address(vault));
        console.log("vault:", address(vault));
        console.log("saving (USDC units):", saving);
        console.log("vault aUSDC:", aBalance);
        require(saving == 0.7e6, "unexpected saving");
        require(aBalance + 1 >= 0.7e6, "vault did not supply to Aave");

        vm.startBroadcast(pk);
        uint256 out = vault.redeem(vault.balanceOf(saver), saver, saver);
        vm.stopBroadcast();

        console.log("redeemed (USDC units):", out);
        console.log("saver USDC start/end:", usdcStart, usdc.balanceOf(saver));
        require(aUsdc.balanceOf(address(vault)) <= 2, "aUSDC left in vault"); // rounding dust only
    }
}
