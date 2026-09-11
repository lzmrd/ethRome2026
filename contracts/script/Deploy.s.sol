// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GoalVaultFactory} from "../src/GoalVaultFactory.sol";
import {PaymentRouter} from "../src/PaymentRouter.sol";
import {IPool} from "../src/interfaces/IPool.sol";
import {FujiAddresses} from "../src/FujiAddresses.sol";

contract Deploy is Script {
    function run() external returns (GoalVaultFactory factory, PaymentRouter router) {
        require(block.chainid == FujiAddresses.CHAIN_ID, "not Fuji");

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        factory = new GoalVaultFactory(IERC20(FujiAddresses.USDC), IPool(FujiAddresses.POOL), IERC20(FujiAddresses.AUSDC));
        router = new PaymentRouter(factory);
        vm.stopBroadcast();

        string memory key = "fuji";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "usdc", FujiAddresses.USDC);
        vm.serializeAddress(key, "pool", FujiAddresses.POOL);
        vm.serializeAddress(key, "aUsdc", FujiAddresses.AUSDC);
        vm.serializeAddress(key, "factory", address(factory));
        vm.serializeAddress(key, "router", address(router));
        string memory json = vm.serializeUint(key, "deployBlock", block.number);
        vm.writeJson(json, "./deployments/fuji.json");

        console.log("GoalVaultFactory:", address(factory));
        console.log("PaymentRouter:   ", address(router));
    }
}
