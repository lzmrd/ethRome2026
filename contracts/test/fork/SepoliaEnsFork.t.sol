// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {FormicaRegistrar} from "../../src/FormicaRegistrar.sol";
import {EnsSepolia} from "../../src/ens/EnsSepolia.sol";
import {
    IPermissionedRegistry,
    IVerifiableFactory,
    IUserRegistryInit,
    IPermissionedResolver
} from "../../src/ens/IEnsV2.sol";

/// @notice Gira contro i contratti ENSv2 beta reali su Sepolia. Salta se
/// SEPOLIA_RPC_URL non è impostata, come il fork test di Fuji in M0.
contract SepoliaEnsForkTest is Test {
    /// @dev owner di formica.eth (wallet demo).
    address internal constant FORMICA_OWNER = 0x6567810126db7b1Fc9F0ebaf2D9962767387CB5f;
    /// @dev vault reale su Fuji, usato come valore del record addr.
    address internal constant FUJI_VAULT = 0x099c2Bc126E748241a77E186b342F8ABA1A642f5;

    bool internal forked;
    IPermissionedRegistry internal formicaRegistry;
    FormicaRegistrar internal registrar;
    address internal user = makeAddr("utenteEns");

    modifier onlyFork() {
        if (!forked) return;
        _;
    }

    function setUp() public {
        string memory rpc = vm.envOr("SEPOLIA_RPC_URL", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        forked = true;

        // 1. registry di formica.eth, root = owner del nome
        vm.prank(FORMICA_OWNER);
        address registryAddr = IVerifiableFactory(EnsSepolia.VERIFIABLE_FACTORY).deployProxy(
            EnsSepolia.USER_REGISTRY_IMPL,
            uint256(keccak256("formica-registry-fork")),
            abi.encodeCall(IUserRegistryInit.initialize, (FORMICA_OWNER, EnsSepolia.ALL_ROLES))
        );
        formicaRegistry = IPermissionedRegistry(registryAddr);

        // 2. aggancia formica.eth alla gerarchia
        vm.prank(FORMICA_OWNER);
        IPermissionedRegistry(EnsSepolia.ETH_REGISTRY).setSubregistry(
            uint256(keccak256(bytes("formica"))), registryAddr
        );

        // 3. il nostro registrar, 4. la delega del ruolo
        registrar = new FormicaRegistrar(
            registryAddr, EnsSepolia.VERIFIABLE_FACTORY, EnsSepolia.USER_REGISTRY_IMPL, EnsSepolia.RESOLVER_IMPL
        );
        vm.prank(FORMICA_OWNER);
        formicaRegistry.grantRootRoles(EnsSepolia.ROLE_REGISTRAR | EnsSepolia.ROLE_RENEW, address(registrar));
    }

    function test_fork_claim_attachesUserRegistryAndResolver() public onlyFork {
        vm.prank(user);
        (address userRegistry, address userResolver) = registrar.claim("mario");

        assertEq(formicaRegistry.getSubregistry("mario"), userRegistry, "subregistry agganciato");
        assertEq(formicaRegistry.getResolver("mario"), userResolver, "resolver agganciato");
        assertGt(userRegistry.code.length, 0, "proxy registry deployato");
        assertGt(userResolver.code.length, 0, "proxy resolver deployato");
    }

    function test_fork_claim_gasCost() public onlyFork {
        vm.prank(user);
        uint256 before = gasleft();
        registrar.claim("mario");
        uint256 used = before - gasleft();
        console.log("claim gas:", used);
        assertLt(used, 3_000_000, "claim deve stare in una tx ragionevole");
    }

    function test_fork_userIsRootOfOwnNamespace() public onlyFork {
        vm.prank(user);
        (address userRegistry, address userResolver) = registrar.claim("mario");

        // l'utente registra il nome del goal nel PROPRIO registry
        vm.prank(user);
        IPermissionedRegistry(userRegistry).register(
            "vacanza", user, address(0), userResolver, EnsSepolia.USER_NAME_ROLES, uint64(block.timestamp) + 365 days
        );
        assertEq(IPermissionedRegistry(userRegistry).getResolver("vacanza"), userResolver, "resolver del goal");

        // il registrar NON può registrare nomi nel namespace dell'utente
        vm.prank(address(registrar));
        vm.expectRevert();
        IPermissionedRegistry(userRegistry).register(
            "abusivo", address(registrar), address(0), userResolver, EnsSepolia.USER_NAME_ROLES, uint64(block.timestamp) + 365 days
        );
    }

    function test_fork_addrRecordPointsToFujiVault() public onlyFork {
        vm.prank(user);
        (address userRegistry, address userResolver) = registrar.claim("mario");
        vm.prank(user);
        IPermissionedRegistry(userRegistry).register(
            "vacanza", user, address(0), userResolver, EnsSepolia.USER_NAME_ROLES, uint64(block.timestamp) + 365 days
        );

        bytes32 node = _namehash("vacanza.mario.formica.eth");
        vm.prank(user);
        IPermissionedResolver(userResolver).setAddr(node, EnsSepolia.FUJI_COIN_TYPE, abi.encodePacked(FUJI_VAULT));

        bytes memory stored = IPermissionedResolver(userResolver).addr(node, EnsSepolia.FUJI_COIN_TYPE);
        assertEq(stored.length, 20, "20 byte di indirizzo");
        assertEq(address(bytes20(stored)), FUJI_VAULT, "il record punta al vault su Fuji");
    }

    function _namehash(string memory name) private pure returns (bytes32 node) {
        node = bytes32(0);
        bytes memory b = bytes(name);
        uint256 end = b.length;
        for (uint256 i = b.length; i > 0; i--) {
            if (b[i - 1] == ".") {
                node = keccak256(abi.encodePacked(node, keccak256(_sub(b, i, end))));
                end = i - 1;
            }
        }
        node = keccak256(abi.encodePacked(node, keccak256(_sub(b, 0, end))));
    }

    function _sub(bytes memory b, uint256 start, uint256 end) private pure returns (bytes memory out) {
        out = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            out[i - start] = b[i];
        }
    }
}
