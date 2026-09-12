import { describe, expect, it } from 'vitest'
import { LEDGER_TOPIC } from './swarm'

describe('swarm config', () => {
  it('il topic è 64 hex senza 0x, come lo valida il proxy Swarm ID', () => {
    expect(LEDGER_TOPIC).toMatch(/^[0-9a-f]{64}$/)
  })
})
