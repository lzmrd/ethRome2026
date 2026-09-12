// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IPermissionedRegistry,
    IVerifiableFactory,
    IUserRegistryInit,
    IPermissionedResolverInit
} from "./ens/IEnsV2.sol";
import {EnsSepolia} from "./ens/EnsSepolia.sol";

/// @notice Registrar delegato di formica.eth: con una transazione l'utente
/// ottiene il proprio namespace ENSv2, di cui è root. Il registrar deploya i
/// contratti dell'utente ma non tiene alcun ruolo al loro interno.
/// Nessun owner, nessuna fee, nessun upgrade.
contract FormicaRegistrar {
    error InvalidLabel();
    error AlreadyClaimed();

    event Claimed(string label, address indexed owner, address registry, address resolver);

    IPermissionedRegistry public immutable FORMICA_REGISTRY;
    IVerifiableFactory public immutable FACTORY;
    address public immutable USER_REGISTRY_IMPL;
    address public immutable RESOLVER_IMPL;

    uint64 public constant DURATION = 365 days;

    /// @notice label ENS scelta da ciascun utente (vuota se non ha ancora fatto claim).
    mapping(address => string) public labelOf;

    constructor(address formicaRegistry, address factory, address userRegistryImpl, address resolverImpl) {
        FORMICA_REGISTRY = IPermissionedRegistry(formicaRegistry);
        FACTORY = IVerifiableFactory(factory);
        USER_REGISTRY_IMPL = userRegistryImpl;
        RESOLVER_IMPL = resolverImpl;
    }

    /// @notice Registra `label`.formica.eth per chi chiama, con registry e
    /// resolver propri. Chi chiama diventa root del proprio namespace.
    function claim(string calldata label) external returns (address registry, address resolver) {
        if (!_isValidLabel(label)) revert InvalidLabel();
        if (bytes(labelOf[msg.sender]).length != 0) revert AlreadyClaimed();

        registry = FACTORY.deployProxy(
            USER_REGISTRY_IMPL,
            uint256(keccak256(abi.encode(msg.sender, label, "registry"))),
            abi.encodeCall(IUserRegistryInit.initialize, (msg.sender, EnsSepolia.ALL_ROLES))
        );

        resolver = FACTORY.deployProxy(
            RESOLVER_IMPL,
            uint256(keccak256(abi.encode(msg.sender, label, "resolver"))),
            abi.encodeCall(
                IPermissionedResolverInit.initialize, (msg.sender, EnsSepolia.ALL_ROLES, new bytes[](0))
            )
        );

        FORMICA_REGISTRY.register(
            label,
            msg.sender,
            registry,
            resolver,
            EnsSepolia.USER_NAME_ROLES,
            uint64(block.timestamp) + DURATION
        );

        labelOf[msg.sender] = label;
        emit Claimed(label, msg.sender, registry, resolver);
    }

    /// @dev 1..32 caratteri, solo [a-z0-9-], senza trattino iniziale o finale.
    function _isValidLabel(string calldata label) private pure returns (bool) {
        bytes calldata b = bytes(label);
        if (b.length == 0 || b.length > 32) return false;
        if (b[0] == "-" || b[b.length - 1] == "-") return false;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c == "-";
            if (!ok) return false;
        }
        return true;
    }
}
