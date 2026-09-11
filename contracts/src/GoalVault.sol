// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPool} from "./interfaces/IPool.sol";

/// @title GoalVault
/// @notice One savings goal = one ERC-4626 vault. Only the owner holds shares.
///         In YIELD mode deposits are supplied to the Aave V3 Pool and the vault holds the aTokens.
contract GoalVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Mode {
        LIQUID,
        YIELD
    }

    uint8 public constant MAX_MULTIPLIER = 10;

    IPool public immutable POOL;
    IERC20 public immutable A_TOKEN;

    string public label;
    Mode public mode;
    uint8 public multiplier;
    uint256 public target;

    event ModeChanged(Mode mode);
    event MultiplierChanged(uint8 multiplier);
    event TargetChanged(uint256 target);

    error InvalidMultiplier(uint8 multiplier);
    error EmptyLabel();

    constructor(
        IERC20 asset_,
        IPool pool_,
        IERC20 aToken_,
        address owner_,
        string memory label_,
        Mode mode_,
        uint8 multiplier_,
        uint256 target_
    ) ERC20(string.concat("Formica Goal ", label_), "fGOAL") ERC4626(asset_) Ownable(owner_) {
        if (bytes(label_).length == 0) revert EmptyLabel();
        _checkMultiplier(multiplier_);
        POOL = pool_;
        A_TOKEN = aToken_;
        label = label_;
        mode = mode_;
        multiplier = multiplier_;
        target = target_;
    }

    /// @dev Idle asset plus aTokens (1:1 claim on the underlying).
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + A_TOKEN.balanceOf(address(this));
    }

    function maxDeposit(address receiver) public view override returns (uint256) {
        return receiver == owner() ? super.maxDeposit(receiver) : 0;
    }

    function maxMint(address receiver) public view override returns (uint256) {
        return receiver == owner() ? super.maxMint(receiver) : 0;
    }

    function setMultiplier(uint8 m) external onlyOwner {
        _checkMultiplier(m);
        multiplier = m;
        emit MultiplierChanged(m);
    }

    function setTarget(uint256 t) external onlyOwner {
        target = t;
        emit TargetChanged(t);
    }

    /// @notice Switches mode and migrates all funds between idle and Aave.
    function setMode(Mode m) external onlyOwner nonReentrant {
        if (m == mode) return;
        mode = m;
        if (m == Mode.YIELD) {
            uint256 idle = IERC20(asset()).balanceOf(address(this));
            if (idle > 0) _supply(idle);
        } else if (A_TOKEN.balanceOf(address(this)) > 0) {
            POOL.withdraw(asset(), type(uint256).max, address(this));
        }
        emit ModeChanged(m);
    }

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        super._deposit(caller, receiver, assets, shares);
        if (mode == Mode.YIELD && assets > 0) _supply(assets);
    }

    function _withdraw(address caller, address receiver, address owner_, uint256 assets, uint256 shares)
        internal
        override
    {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle < assets) {
            uint256 need = assets - idle;
            uint256 aBalance = A_TOKEN.balanceOf(address(this));
            POOL.withdraw(asset(), need >= aBalance ? type(uint256).max : need, address(this));
        }
        super._withdraw(caller, receiver, owner_, assets, shares);
    }

    function _supply(uint256 amount) private {
        IERC20(asset()).forceApprove(address(POOL), amount);
        POOL.supply(asset(), amount, address(this), 0);
    }

    function _checkMultiplier(uint8 m) private pure {
        if (m == 0 || m > MAX_MULTIPLIER) revert InvalidMultiplier(m);
    }
}
