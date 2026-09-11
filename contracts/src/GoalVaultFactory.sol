// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GoalVault} from "./GoalVault.sol";
import {IPool} from "./interfaces/IPool.sol";

/// @title GoalVaultFactory
/// @notice Deploys one GoalVault per savings goal, owned by the caller, and keeps the registry
///         that the PaymentRouter trusts (isVault) and the dashboard enumerates (goalsOf).
contract GoalVaultFactory {
    IERC20 public immutable ASSET;
    IPool public immutable POOL;
    IERC20 public immutable A_TOKEN;

    mapping(address => address[]) private _goals;
    mapping(address => bool) public isVault;

    event GoalCreated(address indexed owner, address indexed vault, string label);

    constructor(IERC20 asset_, IPool pool_, IERC20 aToken_) {
        ASSET = asset_;
        POOL = pool_;
        A_TOKEN = aToken_;
    }

    function createGoal(string calldata label, GoalVault.Mode mode, uint8 multiplier, uint256 target)
        external
        returns (address vault)
    {
        vault = address(new GoalVault(ASSET, POOL, A_TOKEN, msg.sender, label, mode, multiplier, target));
        _goals[msg.sender].push(vault);
        isVault[vault] = true;
        emit GoalCreated(msg.sender, vault, label);
    }

    function goalsOf(address owner) external view returns (address[] memory) {
        return _goals[owner];
    }
}
