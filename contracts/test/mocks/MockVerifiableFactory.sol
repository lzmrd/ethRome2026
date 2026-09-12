// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifiableFactory} from "../../src/ens/IEnsV2.sol";

/// @notice Istanza minima che registra chi l'ha inizializzata, così i test
/// possono verificare che il root sia l'utente e non il registrar.
contract MockProxy {
    address public implementation;
    address public root;
    bool public initialized;

    constructor(address implementation_, bytes memory data) {
        implementation = implementation_;
        // I due initialize dell'ENSv2 iniziano entrambi con (address, uint256, ...):
        // il primo argomento è il root/admin.
        (address account,) = abi.decode(_slice(data), (address, uint256));
        root = account;
        initialized = true;
    }

    function _slice(bytes memory data) private pure returns (bytes memory out) {
        out = new bytes(data.length - 4);
        for (uint256 i = 4; i < data.length; i++) {
            out[i - 4] = data[i];
        }
    }
}

contract MockVerifiableFactory is IVerifiableFactory {
    event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation);

    mapping(bytes32 => bool) public used;

    function deployProxy(address implementation, uint256 salt, bytes calldata data)
        external
        returns (address proxy)
    {
        bytes32 outer = keccak256(abi.encode(msg.sender, salt));
        require(!used[outer], "salt used");
        used[outer] = true;
        proxy = address(new MockProxy(implementation, data));
        emit ProxyDeployed(msg.sender, proxy, salt, implementation);
    }
}
