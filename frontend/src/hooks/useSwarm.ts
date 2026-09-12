import { useCallback, useEffect, useState } from 'react'
import type { ConnectionInfo, SwarmIdClient } from '@snaha/swarm-id'
import { deriveLedgerKeys, getSwarmClient, type LedgerKeys } from '../lib/swarm/client'

/** Il callback di connessione arriva fuori da React: serve il client a portata di mano. */
let instanceRef: SwarmIdClient | undefined

export function useSwarm() {
  const [client, setClient] = useState<SwarmIdClient>()
  const [info, setInfo] = useState<ConnectionInfo>()
  const [keys, setKeys] = useState<LedgerKeys>()
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    let alive = true
    getSwarmClient(() => {
      if (alive && instanceRef) setInfo({ ...instanceRef.connectionInfo })
    })
      .then((c) => {
        if (!alive) return
        instanceRef = c
        setClient(c)
        setInfo({ ...c.connectionInfo })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  // Le chiavi si derivano solo a identità presente, e si azzerano se sparisce.
  useEffect(() => {
    if (!client || !info?.identity) {
      setKeys(undefined)
      return
    }
    let alive = true
    deriveLedgerKeys(client)
      .then((k) => alive && setKeys(k))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [client, info?.identity?.id])

  const connect = useCallback(async () => {
    if (!client) return
    setConnecting(true)
    try {
      await client.connect()
    } finally {
      setConnecting(false)
    }
  }, [client])

  return {
    client,
    info,
    keys,
    connect,
    connecting,
    identity: info?.identity,
    canUpload: Boolean(info?.canUpload),
    uploadMode: info?.uploadMode,
    uploadIssue: info?.uploadUnavailableReason,
  }
}
