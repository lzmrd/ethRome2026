import { SwarmIdClient } from '@snaha/swarm-id'
import { toHex, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ENC_SECRET_LABEL, SIGNER_SECRET_LABEL, SWARM_IFRAME_ORIGIN } from '../../config/swarm'

export type LedgerKeys = {
  /** Chiave privata che firma gli aggiornamenti del feed. Non lasciarla uscire di qui. */
  signer: Hex
  /** Indirizzo del feed: ciò che serve a un lettore per trovarlo. */
  owner: Address
  encryptionKey: Uint8Array
}

let instance: SwarmIdClient | undefined
let ready: Promise<SwarmIdClient> | undefined

/**
 * Ascoltatori vivi, non la callback del primo mount: React StrictMode smonta e
 * rimonta gli effetti, e una callback catturata resterebbe legata al primo.
 */
const listeners = new Set<() => void>()

export function subscribeSwarm(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSwarmClient(): Promise<SwarmIdClient> {
  if (ready) return ready
  instance = new SwarmIdClient({
    iframeOrigin: SWARM_IFRAME_ORIGIN,
    metadata: { name: 'Formica', description: 'Risparmia arrotondando le spese' },
    onConnectionChange: () => {
      for (const listener of listeners) listener()
    },
  })
  ready = instance.initialize().then(() => instance as SwarmIdClient)
  return ready
}

/**
 * Le chiavi nascono da `deriveAppSecret`, che è deterministico per account e
 * per origine: lo stesso account, su un altro browser, ottiene gli stessi byte
 * e quindi lo stesso feed. Non dipendono dal wallet Ethereum.
 */
export async function deriveLedgerKeys(client: SwarmIdClient): Promise<LedgerKeys> {
  const [signerSecret, encryptionKey] = await Promise.all([
    client.deriveAppSecret(SIGNER_SECRET_LABEL),
    client.deriveAppSecret(ENC_SECRET_LABEL),
  ])
  const signer = toHex(signerSecret)
  return { signer, owner: privateKeyToAccount(signer).address, encryptionKey }
}
