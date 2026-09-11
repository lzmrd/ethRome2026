import { BaseError, ContractFunctionRevertedError, InsufficientFundsError, UserRejectedRequestError } from 'viem'

const AAVE_REASONS: Record<string, string> = {
  '27': 'riserva inattiva',
  '28': 'riserva congelata',
  '29': 'riserva in pausa',
  '32': 'liquidità insufficiente per il prelievo',
  '36': 'importo non valido',
  '51': 'cap di deposito raggiunto',
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
  ZeroAmount: 'Importo non valido',
  UnknownVault: 'Vault non registrato nella factory',
  NotVaultOwner: 'Puoi risparmiare solo nei tuoi goal',
  InvalidMultiplier: 'Moltiplicatore fuori range (1-10)',
  EmptyLabel: 'Il nome del goal non può essere vuoto',
  ERC4626ExceededMaxDeposit: 'Importo oltre il massimo depositabile',
  ERC4626ExceededMaxMint: 'Importo oltre il massimo mintabile',
  ERC4626ExceededMaxWithdraw: 'Saldo insufficiente nel goal',
  ERC4626ExceededMaxRedeem: 'Share insufficienti nel goal',
  OwnableUnauthorizedAccount: 'Non sei il proprietario di questo goal',
}

export function humanizeTxError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return 'Transazione rifiutata nel wallet'
    }
    if (error.walk((e) => e instanceof InsufficientFundsError)) {
      return 'AVAX insufficiente per il gas: prendi dal faucet Fuji'
    }

    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName
      if (name && CUSTOM_ERRORS[name]) return CUSTOM_ERRORS[name]
      if (name && AAVE_ERROR_NAMES.has(name)) return 'Liquidità Aave / riserva non disponibile'

      const rawArg = revert.data?.args?.[0]
      const reason = revert.reason ?? (rawArg === undefined ? undefined : String(rawArg))
      if (reason) {
        if (AAVE_REASONS[reason]) return `Liquidità Aave: ${AAVE_REASONS[reason]}`
        if (/^\d{1,3}$/.test(reason)) return 'Liquidità Aave / riserva non disponibile'
        return reason
      }
      return 'Revert del contratto: controlla il dettaglio su Snowtrace'
    }

    const message = error.shortMessage || error.message
    if (/insufficient funds/i.test(message)) return 'AVAX insufficiente per il gas: prendi dal faucet Fuji'
    if (/allowance/i.test(message)) return 'Allowance insufficiente: prima approva il router'
    if (/insufficient balance/i.test(message)) return 'Saldo USDC insufficiente'
    return message.split('\n')[0]
  }
  return error instanceof Error ? error.message : 'Errore sconosciuto'
}
