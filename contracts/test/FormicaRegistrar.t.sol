// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FormicaRegistrar} from "../src/FormicaRegistrar.sol";
import {EnsSepolia} from "../src/ens/EnsSepolia.sol";
import {MockEnsRegistry} from "./mocks/MockEnsRegistry.sol";
import {MockVerifiableFactory, MockProxy} from "./mocks/MockVerifiableFactory.sol";

contract FormicaRegistrarTest is Test {
    MockEnsRegistry internal registry;
    MockVerifiableFactory internal factory;
    FormicaRegistrar internal registrar;

    address internal constant USER_REGISTRY_IMPL = address(0xAAA1);
    address internal constant RESOLVER_IMPL = address(0xAAA2);
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event Claimed(string label, address indexed owner, address registry, address resolver);

    function setUp() public {
        registry = new MockEnsRegistry();
        factory = new MockVerifiableFactory();
        registrar = new FormicaRegistrar(address(registry), address(factory), USER_REGISTRY_IMPL, RESOLVER_IMPL);
        registry.grantRootRoles(EnsSepolia.ROLE_REGISTRAR | EnsSepolia.ROLE_RENEW, address(registrar));
    }

    function test_claim_registersLabelWithUserAsRoot() public {
        vm.prank(alice);
        (address userRegistry, address userResolver) = registrar.claim("mario");

        assertEq(registry.getSubregistry("mario"), userRegistry, "subregistry");
        assertEq(registry.getResolver("mario"), userResolver, "resolver");
        (address owner,,, uint256 roles, uint64 expiry) = registry.entries("mario");
        assertEq(owner, alice, "owner");
        assertEq(roles, EnsSepolia.USER_NAME_ROLES, "bitmap");
        assertEq(expiry, uint64(block.timestamp) + registrar.DURATION(), "expiry");
        assertEq(MockProxy(userRegistry).root(), alice, "registry root = utente");
        assertEq(MockProxy(userResolver).root(), alice, "resolver admin = utente");
        assertEq(registrar.labelOf(alice), "mario", "labelOf");
    }

    function test_claim_emitsClaimed() public {
        vm.expectEmit(false, true, false, false);
        emit Claimed("mario", alice, address(0), address(0));
        vm.prank(alice);
        registrar.claim("mario");
    }

    function test_claim_revertsOnSecondClaimBySameOwner() public {
        vm.startPrank(alice);
        registrar.claim("mario");
        vm.expectRevert(FormicaRegistrar.AlreadyClaimed.selector);
        registrar.claim("mario2");
        vm.stopPrank();
    }

    function test_claim_revertsWhenLabelTaken() public {
        vm.prank(alice);
        registrar.claim("mario");
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(MockEnsRegistry.NameNotAvailable.selector, "mario"));
        registrar.claim("mario");
    }

    function test_claim_rejectsInvalidLabels() public {
        string[7] memory bad = ["", "Mario", "ma.rio", "-mario", "mario-", "ma rio", "mario_1"];
        for (uint256 i = 0; i < bad.length; i++) {
            vm.prank(alice);
            vm.expectRevert(FormicaRegistrar.InvalidLabel.selector);
            registrar.claim(bad[i]);
        }
    }

    function test_claim_rejectsLabelLongerThan32() public {
        vm.prank(alice);
        vm.expectRevert(FormicaRegistrar.InvalidLabel.selector);
        registrar.claim("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"); // 33 caratteri
    }

    function test_claim_acceptsDigitsAndInnerHyphen() public {
        vm.prank(alice);
        registrar.claim("mario-1");
        assertEq(registrar.labelOf(alice), "mario-1");
    }

    function test_claim_twoUsersGetDifferentProxies() public {
        vm.prank(alice);
        (address r1,) = registrar.claim("mario");
        vm.prank(bob);
        (address r2,) = registrar.claim("luigi");
        assertTrue(r1 != r2, "proxy distinti");
    }
}
