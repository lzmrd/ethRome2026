import { useEffect, useState } from 'react'
import type { Hex, SimulateContractParameters } from 'viem'
import { usePublicClient, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { humanizeTxError } from './errors'

export const FEE_OVERRIDES = {
  maxPriorityFeePerGas: 1n,
  maxFeePerGas: 2000n,
} as const

export type TxPhase = 'idle' | 'simulating' | 'signing' | 'mining' | 'success' | 'error'

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

  async function run(params: SimulateContractParameters): Promise<Hex | undefined> {
    if (!publicClient) return undefined
    setError(undefined)
    setPhase('simulating')
    try {
      const simulateParams = { ...params, ...FEE_OVERRIDES } as Parameters<
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
