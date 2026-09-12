// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPermissionedRegistry} from "../../src/ens/IEnsV2.sol";

/// @notice Registry ENSv2 finto: registra label e tiene traccia di ruoli e record.
contract MockEnsRegistry is IPermissionedRegistry {
    error NameNotAvailable(string label);
    error Unauthorized(address caller);

    struct Entry {
        address owner;
        address subregistry;
        address resolver;
        uint256 roleBitmap;
        uint64 expiry;
    }

    mapping(string => Entry) public entries;
    mapping(address => uint256) public rootRoles;
    uint256 public registerCalls;

    function register(
        string calldata label,
        address owner,
        address subregistry,
        address resolver,
        uint256 roleBitmap,
        uint64 expiry
    ) external returns (uint256) {
        if (rootRoles[msg.sender] & (1 << 0) == 0) revert Unauthorized(msg.sender);
        Entry storage existing = entries[label];
        if (existing.owner != address(0) && existing.expiry > block.timestamp) {
            revert NameNotAvailable(label);
        }
        entries[label] = Entry(owner, subregistry, resolver, roleBitmap, expiry);
        registerCalls++;
        return uint256(keccak256(bytes(label)));
    }

    function grantRootRoles(uint256 roleBitmap, address account) external {
        rootRoles[account] |= roleBitmap;
    }

    function setSubregistry(uint256, address) external {}

    function getSubregistry(string calldata label) external view returns (address) {
        return entries[label].subregistry;
    }

    function getResolver(string calldata label) external view returns (address) {
        return entries[label].resolver;
    }
}
