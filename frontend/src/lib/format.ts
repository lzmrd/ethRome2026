import { formatUnits, parseUnits } from 'viem'

export const USDC_DECIMALS = 6

export function formatUsdc(value: bigint, maxFractionDigits = 2): string {
  const raw = formatUnits(value, USDC_DECIMALS)
  const [whole = '0', fraction = ''] = raw.split('.')
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

export function parseUsdc(input: string): bigint | undefined {
  const value = input.trim().replace(',', '.')
  if (value === '' || value === '.' || !/^\d*\.?\d*$/.test(value)) return undefined
  try {
    return parseUnits(value, USDC_DECIMALS)
  } catch {
    return undefined
  }
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatDate(timestamp?: bigint): string {
  if (timestamp === undefined) return '—'
  return new Date(Number(timestamp) * 1000).toLocaleString()
}
