// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FormicaRegistrar} from "../src/FormicaRegistrar.sol";
import {EnsSepolia} from "../src/ens/EnsSepolia.sol";
import {IPermissionedRegistry, IVerifiableFactory, IUserRegistryInit} from "../src/ens/IEnsV2.sol";

/// @notice Setup una tantum di formica.eth su Sepolia. Idempotente: se
/// deployments/sepolia-ens.json esiste già, riusa gli indirizzi e salta i
/// passi fatti. Serve perché la beta ENSv2 può essere azzerata da ENS.
contract SetupEns is Script {
    function run() external {
        require(block.chainid == EnsSepolia.CHAIN_ID, "not Sepolia");

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(pk);

        string memory path = "./deployments/sepolia-ens.json";
        address existingRegistry;
        address existingRegistrar;
        if (vm.exists(path)) {
            string memory json = vm.readFile(path);
            existingRegistry = vm.parseJsonAddress(json, ".formicaRegistry");
            existingRegistrar = vm.parseJsonAddress(json, ".formicaRegistrar");
            console.log("stato esistente letto da", path);
        } else {
            console.log("nessuno stato precedente, setup da zero");
        }

        vm.startBroadcast(pk);

        address registryAddr = existingRegistry;
        if (registryAddr.code.length == 0) {
            registryAddr = IVerifiableFactory(EnsSepolia.VERIFIABLE_FACTORY).deployProxy(
                EnsSepolia.USER_REGISTRY_IMPL,
                uint256(keccak256("formica.eth/registry/v1")),
                abi.encodeCall(IUserRegistryInit.initialize, (owner, EnsSepolia.ALL_ROLES))
            );
            console.log("UserRegistry di formica.eth:", registryAddr);
        }

        // Aggancia formica.eth: senza questo i nomi non risolvono.
        if (IPermissionedRegistry(EnsSepolia.ETH_REGISTRY).getSubregistry("formica") != registryAddr) {
            IPermissionedRegistry(EnsSepolia.ETH_REGISTRY).setSubregistry(
                uint256(keccak256(bytes("formica"))), registryAddr
            );
            console.log("formica.eth agganciato al registry");
        }

        address registrarAddr = existingRegistrar;
        if (registrarAddr.code.length == 0) {
            registrarAddr = address(
                new FormicaRegistrar(
                    registryAddr,
                    EnsSepolia.VERIFIABLE_FACTORY,
                    EnsSepolia.USER_REGISTRY_IMPL,
                    EnsSepolia.RESOLVER_IMPL
                )
            );
            console.log("FormicaRegistrar:", registrarAddr);
        }

        IPermissionedRegistry(registryAddr).grantRootRoles(
            EnsSepolia.ROLE_REGISTRAR | EnsSepolia.ROLE_RENEW, registrarAddr
        );
        console.log("ruoli delegati al registrar");

        vm.stopBroadcast();

        string memory out = "ens";
        vm.serializeUint(out, "chainId", EnsSepolia.CHAIN_ID);
        vm.serializeAddress(out, "ethRegistry", EnsSepolia.ETH_REGISTRY);
        vm.serializeAddress(out, "formicaRegistry", registryAddr);
        vm.serializeUint(out, "setupBlock", block.number);
        string memory json = vm.serializeAddress(out, "formicaRegistrar", registrarAddr);
        vm.writeJson(json, path);
        console.log("scritto", path);
    }
}
