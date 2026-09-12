// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Sottoinsieme minimo dei contratti ENSv2 beta che Formica chiama.
/// Firme dalla documentazione ENS del 2026-09-12 (docs.ens.domains/llms-full.txt).
interface IPermissionedRegistry {
    function register(
        string calldata label,
        address owner,
        address subregistry,
        address resolver,
        uint256 roleBitmap,
        uint64 expiry
    ) external returns (uint256 tokenId);

    function grantRootRoles(uint256 roleBitmap, address account) external;

    function setSubregistry(uint256 anyId, address subregistry) external;

    function getSubregistry(string calldata label) external view returns (address);

    function getResolver(string calldata label) external view returns (address);
}

interface IVerifiableFactory {
    function deployProxy(address implementation, uint256 salt, bytes calldata data)
        external
        returns (address proxy);
}

interface IUserRegistryInit {
    function initialize(address rootAccount, uint256 roleBitmap) external;
}

interface IPermissionedResolverInit {
    function initialize(address admin, uint256 roleBitmap, bytes[] calldata setters) external;
}

interface IPermissionedResolver {
    function setAddr(bytes32 node, uint256 coinType, bytes calldata value) external;
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory);
}
