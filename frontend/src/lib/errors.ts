import { BaseError, ContractFunctionRevertedError, InsufficientFundsError, UserRejectedRequestError } from 'viem'

const AAVE_REASONS: Record<string, string> = {
  '27': 'reserve inactive',
  '28': 'reserve frozen',
  '29': 'reserve paused',
  '32': 'not enough liquidity to withdraw',
  '36': 'invalid amount',
  '51': 'supply cap reached',
}

const AAVE_ERROR_NAMES = new Set([
  'ReserveInactive',
  'ReserveFrozen',
  'ReservePaused',
  'ReserveNotInitialized',
  'SupplyCapExceeded',
  'BorrowCapExceeded',
  'NotEnoughAvailableUserBalance',
  'InvalidAmount',
])

const CUSTOM_ERRORS: Record<string, string> = {
  ZeroAmount: 'Invalid amount',
  UnknownVault: 'Vault not registered in the factory',
  NotVaultOwner: 'You can only save into your own goals',
  InvalidMultiplier: 'Multiplier out of range (1-10)',
  EmptyLabel: 'Goal name cannot be empty',
  ERC4626ExceededMaxDeposit: 'Amount above the deposit maximum',
  ERC4626ExceededMaxMint: 'Amount above the mint maximum',
  ERC4626ExceededMaxWithdraw: 'Not enough balance in the goal',
  ERC4626ExceededMaxRedeem: 'Not enough shares in the goal',
  OwnableUnauthorizedAccount: 'You are not the owner of this goal',
}

export function humanizeTxError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return 'Transaction rejected in the wallet'
    }
    if (error.walk((e) => e instanceof InsufficientFundsError)) {
      return 'Not enough AVAX for gas: use the Fuji faucet'
    }

    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName
      if (name && CUSTOM_ERRORS[name]) return CUSTOM_ERRORS[name]
      if (name && AAVE_ERROR_NAMES.has(name)) return 'Aave liquidity / reserve unavailable'

      const rawArg = revert.data?.args?.[0]
      const reason = revert.reason ?? (rawArg === undefined ? undefined : String(rawArg))
      if (reason) {
        if (AAVE_REASONS[reason]) return `Aave liquidity: ${AAVE_REASONS[reason]}`
        if (/^\d{1,3}$/.test(reason)) return 'Aave liquidity / reserve unavailable'
        return reason
      }
      return 'Contract reverted: check the details on Snowtrace'
    }

    const message = error.shortMessage || error.message
    if (/insufficient funds/i.test(message)) return 'Not enough AVAX for gas: use the Fuji faucet'
    if (/allowance/i.test(message)) return 'Insufficient allowance: approve the router first'
    if (/insufficient balance/i.test(message)) return 'Not enough USDC balance'
    return message.split('\n')[0]
  }
  return error instanceof Error ? error.message : 'Unknown error'
}
