// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {GoalVault} from "./GoalVault.sol";
import {GoalVaultFactory} from "./GoalVaultFactory.sol";

/// @title PaymentRouter
/// @notice Rounds spending up and income down to the next/previous whole USDC and saves the difference,
///         times the goal's multiplier, into a GoalVault — all in one transaction. Holds no funds between calls.
contract PaymentRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant STEP = 1e6; // 1 USDC

    GoalVaultFactory public immutable FACTORY;
    IERC20 public immutable ASSET;

    event PaymentRounded(address indexed payer, address indexed merchant, uint256 amount, uint256 saving, address vault);
    event IncomeRounded(address indexed payer, address indexed recipient, uint256 amount, uint256 saving, address vault);

    error ZeroAmount();
    error UnknownVault(address vault);
    error NotVaultOwner(address vault, address caller);

    constructor(GoalVaultFactory factory_) {
        FACTORY = factory_;
        ASSET = factory_.ASSET();
    }

    /// @notice Saving for a payment: distance to the next whole USDC, times the multiplier. Round amounts save 0.
    function quoteRoundUp(uint256 amount, uint8 multiplier) public pure returns (uint256) {
        uint256 remainder = amount % STEP;
        return remainder == 0 ? 0 : (STEP - remainder) * multiplier;
    }

    /// @notice Saving for an income: the cents above the whole USDC, times the multiplier,
    ///         capped at the integer part. Incomes below 1 USDC save 0.
    function quoteRoundDown(uint256 amount, uint8 multiplier) public pure returns (uint256) {
        uint256 remainder = amount % STEP;
        uint256 floorAmount = amount - remainder;
        if (floorAmount == 0) return 0;
        uint256 saving = remainder * multiplier;
        return saving < floorAmount ? saving : floorAmount;
    }

    /// @notice The caller pays `amount` to `merchant` and saves the round-up into their own goal.
    function payWithRoundUp(address merchant, uint256 amount, address vault)
        external
        nonReentrant
        returns (uint256 saving)
    {
        GoalVault goal = _goal(vault);
        if (amount == 0) revert ZeroAmount();
        if (goal.owner() != msg.sender) revert NotVaultOwner(vault, msg.sender);

        saving = quoteRoundUp(amount, goal.multiplier());
        ASSET.safeTransferFrom(msg.sender, merchant, amount);
        _save(goal, msg.sender, saving);
        emit PaymentRounded(msg.sender, merchant, amount, saving, vault);
    }

    /// @notice The caller pays an income of `amount` to the goal's owner; the round-down goes into the goal.
    function receiveWithRoundDown(uint256 amount, address vault) external nonReentrant returns (uint256 saving) {
        GoalVault goal = _goal(vault);
        if (amount == 0) revert ZeroAmount();

        address recipient = goal.owner();
        saving = quoteRoundDown(amount, goal.multiplier());
        ASSET.safeTransferFrom(msg.sender, recipient, amount - saving);
        _save(goal, recipient, saving);
        emit IncomeRounded(msg.sender, recipient, amount, saving, vault);
    }

    function _goal(address vault) private view returns (GoalVault) {
        if (!FACTORY.isVault(vault)) revert UnknownVault(vault);
        return GoalVault(vault);
    }

    function _save(GoalVault goal, address beneficiary, uint256 saving) private {
        if (saving == 0) return;
        ASSET.safeTransferFrom(msg.sender, address(this), saving);
        ASSET.forceApprove(address(goal), saving);
        goal.deposit(saving, beneficiary);
    }
}
