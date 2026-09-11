import { parseAbi } from 'viem'

export const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
])

export const factoryAbi = parseAbi([
  'function goalsOf(address owner) view returns (address[])',
  'function isVault(address vault) view returns (bool)',
  'function createGoal(string label, uint8 mode, uint8 multiplier, uint256 target) returns (address)',
  'event GoalCreated(address indexed owner, address indexed vault, string label)',
])

export const vaultAbi = parseAbi([
  'function owner() view returns (address)',
  'function label() view returns (string)',
  'function mode() view returns (uint8)',
  'function multiplier() view returns (uint8)',
  'function target() view returns (uint256)',
  'function netDeposited() view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function maxWithdraw(address owner) view returns (uint256)',
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)',
])

export const routerAbi = parseAbi([
  'function quoteRoundUp(uint256 amount, uint8 multiplier) pure returns (uint256)',
  'function quoteRoundDown(uint256 amount, uint8 multiplier) pure returns (uint256)',
  'function payWithRoundUp(address merchant, uint256 amount, address vault) returns (uint256)',
  'function receiveWithRoundDown(uint256 amount, address vault) returns (uint256)',
])

export const poolAbi = parseAbi([
  'function getReserveData(address asset) view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
])
