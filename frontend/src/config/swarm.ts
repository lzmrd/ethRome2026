import { keccak256, toBytes } from 'viem'

/** Dominio fidato che custodisce l'identità: l'app non vede mai la master key. */
export const SWARM_IFRAME_ORIGIN = 'https://swarm-id.snaha.net'

/** Topic del feed: 32 byte fissi, uguali per ogni utente. Il feed è distinto dal proprietario. */
export const LEDGER_TOPIC = keccak256(toBytes('formica-ledger-v1'))

/** Etichette dei segreti derivati. Cambiare una di queste rende illeggibili i libretti esistenti. */
export const SIGNER_SECRET_LABEL = 'formica-ledger-signer'
export const ENC_SECRET_LABEL = 'formica-ledger-enc'

/** Chiave del text record ENS che pubblica il manifest del feed. */
export const LEDGER_RECORD_KEY = 'formica.ledger'
