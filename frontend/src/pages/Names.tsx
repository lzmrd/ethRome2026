import { useEffect, useMemo, useRef, useState } from 'react'
import { encodePacked, zeroAddress, type Address, type Hex } from 'viem'
import { namehash } from 'viem/ens'
import { useConnect, useConnection, useConnectors, useReadContract, useSwitchChain } from 'wagmi'
import { avalancheFuji } from 'wagmi/chains'
import { TxStatus } from '../components/TxStatus'
import { FUJI_CHAIN_ID } from '../config/addresses'
import {
  ENS_EXPLORER,
  FORMICA_REGISTRAR,
  FORMICA_REGISTRY,
  FORMICA_ROOT,
  FUJI_COIN_TYPE,
  SEPOLIA_CHAIN_ID,
  USER_NAME_ROLES,
  ensRegistrarAbi,
  ensRegistryAbi,
  ensResolverAbi,
} from '../config/ens'
import { useUserGoals, useVaultLabels } from '../hooks/useGoals'
import { useLedger } from '../hooks/useLedger'
import { LEDGER_RECORD_KEY, LEDGER_TOPIC } from '../config/swarm'
import { shortAddress } from '../lib/format'
import { useTx } from '../lib/tx'

const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/
const ONE_YEAR = 365n * 24n * 3600n

export function Names() {
  const connection = useConnection()
  const connect = useConnect()
  const connectors = useConnectors()
  const { mutate: switchChain, isPending: switching } = useSwitchChain()
  const account = connection.address
  const onSepolia = connection.chainId === SEPOLIA_CHAIN_ID

  const [labelInput, setLabelInput] = useState('')

  const labelQuery = useReadContract({
    address: FORMICA_REGISTRAR,
    abi: ensRegistrarAbi,
    functionName: 'labelOf',
    args: account ? [account] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: Boolean(account) },
  })
  const myLabel = labelQuery.data && labelQuery.data.length > 0 ? labelQuery.data : undefined

  const subregistry = useReadContract({
    address: FORMICA_REGISTRY,
    abi: ensRegistryAbi,
    functionName: 'getSubregistry',
    args: myLabel ? [myLabel] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: Boolean(myLabel) },
  })
  const resolver = useReadContract({
    address: FORMICA_REGISTRY,
    abi: ensRegistryAbi,
    functionName: 'getResolver',
    args: myLabel ? [myLabel] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: Boolean(myLabel) },
  })

  const claim = useTx(SEPOLIA_CHAIN_ID)

  const ledger = useLedger()
  const userNode = myLabel ? namehash(`${myLabel}.${FORMICA_ROOT}`) : undefined
  const userResolver = resolver.data && resolver.data !== zeroAddress ? resolver.data : undefined
  const ledgerRecord = useReadContract({
    address: userResolver,
    abi: ensResolverAbi,
    functionName: 'text',
    args: userNode ? [userNode, LEDGER_RECORD_KEY] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: Boolean(userResolver && userNode) },
  })
  const publish = useTx(SEPOLIA_CHAIN_ID)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string>()

  useEffect(() => {
    if (publish.phase === 'success') void ledgerRecord.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publish.phase])

  async function onPublishManifest() {
    if (!account || !userResolver || !userNode || !ledger.client || !ledger.keys) return
    setPublishError(undefined)
    setPublishing(true)
    try {
      // Il feed è firmato dal signer derivato, non dall'app signer: il manifest
      // deve dichiararne l'owner (40 hex senza 0x, come valida il proxy),
      // altrimenti pubblicherebbe un feed vuoto. Il manifest resta in chiaro
      // perché il gateway possa seguire il feed: è il payload a essere cifrato.
      const manifestRef = await ledger.client.createFeedManifest(
        LEDGER_TOPIC,
        { owner: ledger.keys.owner.slice(2), uploadOptions: { encrypt: false } },
        { timeout: 120_000 },
      )
      await publish.run({
        account,
        address: userResolver,
        abi: ensResolverAbi,
        functionName: 'setText',
        args: [userNode, LEDGER_RECORD_KEY, manifestRef],
      })
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Creazione del manifest fallita')
    } finally {
      setPublishing(false)
    }
  }

  const publishBusy = publishing || ['simulating', 'signing', 'mining'].includes(publish.phase)

  useEffect(() => {
    if (claim.phase === 'success') void labelQuery.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim.phase])

  const normalizedLabel = labelInput.trim()
  const labelValid = LABEL_RE.test(normalizedLabel)
  const busy = ['simulating', 'signing', 'mining'].includes(claim.phase)
  const canClaim = Boolean(account) && labelValid && onSepolia && !busy

  async function onClaim() {
    if (!account || !labelValid) return
    await claim.run({
      account,
      address: FORMICA_REGISTRAR,
      abi: ensRegistrarAbi,
      functionName: 'claim',
      args: [normalizedLabel],
    })
  }

  const goals = useUserGoals(account, FUJI_CHAIN_ID)
  const vaults = useMemo(() => (goals.data ?? []) as readonly Address[], [goals.data])
  const { labels } = useVaultLabels(vaults, FUJI_CHAIN_ID)

  if (!connection.isConnected) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <h2 className="text-lg font-semibold">Connetti un wallet</h2>
        <p className="mt-2 text-sm text-neutral-400">
          I nomi vivono su Sepolia (ENSv2 beta); i goal restano su Avalanche Fuji.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-50"
              disabled={connect.isPending}
              onClick={() => connect.mutate({ connector })}
            >
              {connector.name}
            </button>
          ))}
        </div>
        {connect.error && <p className="mt-3 text-sm text-red-400">{connect.error.message}</p>}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">Nomi</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Il tuo namespace ENSv2 su Sepolia: <code>{FORMICA_ROOT}</code>. Formica deploya registry e resolver, ma la
        radice sei tu: Formica non può modificare i tuoi nomi.
      </p>

      {!onSepolia && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <p className="text-amber-300">Per registrare i nomi serve la rete Sepolia.</p>
          <button
            className="mt-2 rounded-lg border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-400 disabled:opacity-40"
            disabled={switching}
            onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
          >
            Passa a Sepolia
          </button>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        {myLabel ? (
          <>
            <h2 className="font-semibold">Il tuo namespace</h2>
            <a
              className="mt-1 block font-mono text-sm text-amber-400 underline decoration-dotted"
              href={`${ENS_EXPLORER}${myLabel}.${FORMICA_ROOT}`}
              target="_blank"
              rel="noreferrer"
            >
              {myLabel}.{FORMICA_ROOT}
            </a>
            <p className="mt-2 text-xs text-neutral-500">
              sei tu la radice di questo namespace: Formica non può modificarlo
            </p>
            <dl className="mt-3 space-y-1 text-xs text-neutral-400">
              <div className="flex justify-between gap-2">
                <dt>registry</dt>
                <dd className="font-mono">
                  {subregistry.data && subregistry.data !== zeroAddress ? shortAddress(subregistry.data) : '…'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>resolver</dt>
                <dd className="font-mono">
                  {resolver.data && resolver.data !== zeroAddress ? shortAddress(resolver.data) : '…'}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <h2 className="font-semibold">Reclama il tuo namespace</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Una transazione su Sepolia: registry e resolver tuoi, per sempre.
            </p>
            <input
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              placeholder="mario"
              className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs outline-none focus:border-amber-500"
            />
            {labelInput.trim() !== '' && !labelValid && (
              <span className="mt-1 block text-xs text-red-400">
                Minuscole, numeri e trattini; niente punti, max 32 caratteri.
              </span>
            )}
            {labelValid && (
              <span className="mt-1 block text-xs text-neutral-500">
                diventerà {normalizedLabel}.{FORMICA_ROOT}
              </span>
            )}
            <button
              onClick={onClaim}
              disabled={!canClaim}
              className="mt-3 w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-40"
            >
              Reclama il tuo namespace
            </button>
            <TxStatus phase={claim.phase} hash={claim.hash} error={claim.error} />
          </>
        )}
      </div>

      {myLabel && ledger.identity && (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-semibold">Libretto privato</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Il record <code>{LEDGER_RECORD_KEY}</code> pubblica nel nome il riferimento al feed Swarm cifrato: il
            libretto diventa trovabile a partire da {myLabel}.{FORMICA_ROOT} senza passare da questa app. Una
            transazione, poi le note restano fuori catena.
          </p>
          {ledgerRecord.data ? (
            <p className="mt-3 break-all font-mono text-xs text-neutral-400">
              {LEDGER_RECORD_KEY} = {ledgerRecord.data}
            </p>
          ) : (
            <p className="mt-3 text-xs text-neutral-600">nessun manifest pubblicato nel nome</p>
          )}
          <button
            onClick={onPublishManifest}
            disabled={!onSepolia || !ledger.canUpload || publishBusy || !userResolver || !userNode}
            className="mt-3 w-full rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-400 disabled:opacity-40"
          >
            {publishing
              ? 'Creo il manifest…'
              : publishBusy
                ? 'Invio la transazione…'
                : ledgerRecord.data
                  ? 'Ripubblica nel nome'
                  : 'Pubblica nel nome'}
          </button>
          {!ledger.canUpload && (
            <p className="mt-1 text-xs text-amber-400">Serve un francobollo postale per creare il manifest.</p>
          )}
          {publishError && <p className="mt-1 text-xs text-red-400">{publishError}</p>}
          <TxStatus phase={publish.phase} hash={publish.hash} error={publish.error} />
        </div>
      )}

      {myLabel && (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-semibold">Nomi dei goal</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Ogni nome è due transazioni su Sepolia: la registrazione nel tuo registry e il record che punta al vault
            su Fuji.
          </p>
          {goals.isLoading && <p className="mt-3 text-sm text-neutral-400">Lettura goal…</p>}
          {goals.data && goals.data.length === 0 && (
            <p className="mt-3 text-sm text-neutral-500">Non hai ancora goal su Fuji.</p>
          )}
          <ul className="mt-3 divide-y divide-neutral-800">
            {vaults.map((vault, index) => {
              const goalLabel = labels[index]
              if (!goalLabel) return null
              return (
                <GoalNameRow
                  key={vault}
                  vault={vault}
                  goalLabel={goalLabel}
                  userLabel={myLabel}
                  account={account as Address}
                  registry={subregistry.data && subregistry.data !== zeroAddress ? subregistry.data : undefined}
                  resolver={resolver.data && resolver.data !== zeroAddress ? resolver.data : undefined}
                  onSepolia={onSepolia}
                />
              )
            })}
          </ul>
        </div>
      )}

      {onSepolia && (
        <button
          className="mt-6 text-sm text-neutral-400 underline"
          onClick={() => switchChain({ chainId: avalancheFuji.id })}
        >
          Torna a Fuji
        </button>
      )}
    </div>
  )
}

function GoalNameRow({
  vault,
  goalLabel,
  userLabel,
  account,
  registry,
  resolver,
  onSepolia,
}: {
  vault: Address
  goalLabel: string
  userLabel: string
  account: Address
  /** Registry ENSv2 dell'utente: e' qui che vivono i nomi dei goal, non in quello di formica.eth. */
  registry?: Address
  resolver?: Address
  onSepolia: boolean
}) {
  const fullName = `${goalLabel}.${userLabel}.${FORMICA_ROOT}`
  const node = namehash(fullName)

  const goalResolver = useReadContract({
    address: registry,
    abi: ensRegistryAbi,
    functionName: 'getResolver',
    args: [goalLabel],
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: Boolean(registry) },
  })
  const ownedResolver =
    goalResolver.data && goalResolver.data !== zeroAddress ? goalResolver.data : resolver

  const record = useReadContract({
    address: ownedResolver,
    abi: ensResolverAbi,
    functionName: 'addr',
    args: [node, FUJI_COIN_TYPE],
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: Boolean(ownedResolver) },
  })

  const registered = Boolean(goalResolver.data && goalResolver.data !== zeroAddress)
  const stored = record.data as Hex | undefined
  const pointsToVault = Boolean(stored && stored.length === 42 && stored.toLowerCase() === vault.toLowerCase())
  const [justRegistered, setJustRegistered] = useState(false)

  const registerTx = useTx(SEPOLIA_CHAIN_ID)
  const addrTx = useTx(SEPOLIA_CHAIN_ID)
  const sequenceStarted = useRef(false)

  useEffect(() => {
    if (registerTx.phase !== 'success' || sequenceStarted.current || !ownedResolver) return
    sequenceStarted.current = true
    void addrTx.run({
      account,
      address: ownedResolver,
      abi: ensResolverAbi,
      functionName: 'setAddr',
      args: [node, FUJI_COIN_TYPE, encodePacked(['address'], [vault])],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerTx.phase])

  useEffect(() => {
    if (addrTx.phase === 'success') setJustRegistered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addrTx.phase])

  const busy =
    ['simulating', 'signing', 'mining'].includes(registerTx.phase) ||
    ['simulating', 'signing', 'mining'].includes(addrTx.phase)
  const canAct = Boolean(account && registry && ownedResolver) && onSepolia && !busy
  const done = (registered && pointsToVault) || justRegistered

  async function onRegister() {
    if (!registry || !ownedResolver) return
    await registerTx.run({
      account,
      address: registry,
      abi: ensRegistryAbi,
      functionName: 'register',
      args: [
        goalLabel,
        account,
        zeroAddress,
        ownedResolver,
        USER_NAME_ROLES,
        BigInt(Math.floor(Date.now() / 1000)) + ONE_YEAR,
      ],
    })
  }

  async function onSetAddr() {
    if (!ownedResolver) return
    await addrTx.run({
      account,
      address: ownedResolver,
      abi: ensResolverAbi,
      functionName: 'setAddr',
      args: [node, FUJI_COIN_TYPE, encodePacked(['address'], [vault])],
    })
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{goalLabel}</p>
          <p className="text-xs text-neutral-500">{shortAddress(vault)}</p>
        </div>
        {done ? (
          <a
            className="font-mono text-xs text-amber-400 underline decoration-dotted"
            href={`${ENS_EXPLORER}${fullName}`}
            target="_blank"
            rel="noreferrer"
          >
            {fullName}
          </a>
        ) : !registered ? (
          <button
            onClick={onRegister}
            disabled={!canAct}
            className="rounded-lg border border-amber-500 px-3 py-1.5 text-xs font-medium text-amber-400 disabled:opacity-40"
          >
            Dai un nome
          </button>
        ) : (
          <button
            onClick={onSetAddr}
            disabled={!canAct}
            className="rounded-lg border border-amber-500 px-3 py-1.5 text-xs font-medium text-amber-400 disabled:opacity-40"
          >
            Collega il vault
          </button>
        )}
      </div>
      <TxStatus phase={registerTx.phase} hash={registerTx.hash} error={registerTx.error} />
      <TxStatus phase={addrTx.phase} hash={addrTx.hash} error={addrTx.error} />
    </li>
  )
}
