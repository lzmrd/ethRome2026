import { useEffect, useState } from 'react'
import type { Account, Address, Hex, SimulateContractParameters } from 'viem'
import { usePublicClient, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { humanizeTxError } from './errors'

type Fees = { maxPriorityFeePerGas: bigint; maxFeePerGas: bigint }

// Fuji ha base fee ~10 wei: tip minima e tetto basso, ma calcolato sul blocco
// corrente cosi' una risalita della base fee non fa fallire ogni tx.
export const FEE_FLOOR: Fees = { maxPriorityFeePerGas: 1n, maxFeePerGas: 2000n }

export type TxPhase = 'idle' | 'simulating' | 'signing' | 'mining' | 'success' | 'error'

async function currentFees(client: { getBlock: () => Promise<{ baseFeePerGas?: bigint | null }> }): Promise<Fees> {
  try {
    const base = (await client.getBlock()).baseFeePerGas ?? 0n
    const cap = base * 4n
    return { maxPriorityFeePerGas: 1n, maxFeePerGas: cap > FEE_FLOOR.maxFeePerGas ? cap : FEE_FLOOR.maxFeePerGas }
  } catch {
    return FEE_FLOOR
  }
}

export function useTx() {
  const publicClient = usePublicClient()
  const { mutateAsync: writeContract } = useWriteContract()
  const [phase, setPhase] = useState<TxPhase>('idle')
  const [hash, setHash] = useState<Hex>()
  const [error, setError] = useState<string>()

  const receipt = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (receipt.isSuccess && phase === 'mining') setPhase('success')
  }, [receipt.isSuccess, phase])

  useEffect(() => {
    if (receipt.error && phase === 'mining') {
      setPhase('error')
      setError(humanizeTxError(receipt.error))
    }
  }, [receipt.error, phase])

  async function run(
    params: Omit<SimulateContractParameters, 'account'> & { account?: Account | Address }
  ): Promise<Hex | undefined> {
    if (!publicClient) return undefined
    setError(undefined)
    setHash(undefined)
    setPhase('simulating')
    try {
      const fees = await currentFees(publicClient)
      const simulateParams = { ...params, ...fees } as Parameters<
        typeof publicClient.simulateContract
      >[0]
      const { request } = await publicClient.simulateContract(simulateParams)
      setPhase('signing')
      const txHash = await writeContract(request as unknown as Parameters<typeof writeContract>[0])
      setHash(txHash)
      setPhase('mining')
      return txHash
    } catch (e) {
      setPhase('error')
      setError(humanizeTxError(e))
      return undefined
    }
  }

  function reset() {
    setPhase('idle')
    setHash(undefined)
    setError(undefined)
  }

  return { phase, hash, error, run, reset, receipt }
}
