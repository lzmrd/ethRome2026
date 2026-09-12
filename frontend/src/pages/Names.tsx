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
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface/80 p-8 text-center shadow-[0_12px_32px_-16px_rgba(0,0,0,0.9)] backdrop-blur-sm">
        <h2 className="text-lg font-semibold">Connect a wallet</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Names live on Sepolia (ENSv2 beta); goals stay on Avalanche Fuji.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-neutral-950 shadow-[0_6px_20px_-8px_rgba(245,165,36,0.8)] transition duration-150 ease-soft hover:bg-brand-soft active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
              disabled={connect.isPending}
              onClick={() => connect.mutate({ connector })}
            >
              {connector.name}
            </button>
          ))}
        </div>
        {connect.error && <p className="mt-3 text-sm text-bad">{connect.error.message}</p>}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Names</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your ENSv2 namespace on Sepolia: <code>{FORMICA_ROOT}</code>. Formica deploys the registry and resolver, but
        you are the root: Formica cannot modify your names.
      </p>

      {!onSepolia && (
        <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-3.5 text-sm">
          <p className="text-brand-soft">Registering names requires the Sepolia network.</p>
          <button
            className="mt-2 rounded-lg border border-amber-500 px-3 py-1.5 text-sm font-medium text-brand-soft disabled:opacity-40"
            disabled={switching}
            onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-line bg-surface/80 p-5 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.9)] backdrop-blur-sm">
        {myLabel ? (
          <>
            <h2 className="font-semibold">Your namespace</h2>
            <a
              className="mt-1 block font-mono text-sm text-brand-soft underline decoration-dotted"
              href={`${ENS_EXPLORER}${myLabel}.${FORMICA_ROOT}`}
              target="_blank"
              rel="noreferrer"
            >
              {myLabel}.{FORMICA_ROOT}
            </a>
            <p className="mt-2 text-xs text-ink-mute">
              you are the root of this namespace: Formica cannot modify it
            </p>
            <dl className="mt-3 space-y-1 text-xs text-ink-soft">
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
            <h2 className="font-semibold">Claim your namespace</h2>
            <p className="mt-1 text-xs text-ink-mute">
              One transaction on Sepolia: your own registry and resolver, forever.
            </p>
            <input
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              placeholder="mario"
              className="mt-3 w-full rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5 font-mono text-xs transition duration-150 ease-soft placeholder:text-ink-mute hover:border-line-strong focus:border-brand focus:outline-none"
            />
            {labelInput.trim() !== '' && !labelValid && (
              <span className="mt-1 block text-xs text-bad">
                Lowercase letters, numbers and hyphens; no dots, max 32 characters.
              </span>
            )}
            {labelValid && (
              <span className="mt-1 block text-xs text-ink-mute">
                will become {normalizedLabel}.{FORMICA_ROOT}
              </span>
            )}
            <button
              onClick={onClaim}
              disabled={!canClaim}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-neutral-950 shadow-[0_6px_20px_-8px_rgba(245,165,36,0.8)] transition duration-150 ease-soft hover:bg-brand-soft active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              Claim your namespace
            </button>
            <TxStatus phase={claim.phase} hash={claim.hash} error={claim.error} />
          </>
        )}
      </div>

      {myLabel && ledger.identity && (
        <div className="mt-4 rounded-2xl border border-line bg-surface/80 p-5 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <h2 className="font-semibold">Private ledger</h2>
          <p className="mt-1 text-xs text-ink-mute">
            The <code>{LEDGER_RECORD_KEY}</code> record publishes the encrypted Swarm feed reference in the name: the
            ledger becomes discoverable from {myLabel}.{FORMICA_ROOT} without this app. One transaction, then the
            notes stay off-chain.
          </p>
          {ledgerRecord.data ? (
            <p className="mt-3 break-all font-mono text-xs text-ink-soft">
              {LEDGER_RECORD_KEY} = {ledgerRecord.data}
            </p>
          ) : (
            <p className="mt-3 text-xs text-ink-mute">no manifest published in the name</p>
          )}
          <button
            onClick={onPublishManifest}
            disabled={!onSepolia || !ledger.canUpload || publishBusy || !userResolver || !userNode}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-good/40 bg-good/5 px-4 py-2.5 text-sm font-medium text-good transition duration-150 ease-soft hover:bg-good/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publishing
              ? 'Creating manifest…'
              : publishBusy
                ? 'Sending transaction…'
                : ledgerRecord.data
                  ? 'Republish in the name'
                  : 'Publish in the name'}
          </button>
          {!ledger.canUpload && (
            <p className="mt-1 text-xs text-brand-soft">A postage stamp is required to create the manifest.</p>
          )}
          {publishError && <p className="mt-1 text-xs text-bad">{publishError}</p>}
          <TxStatus phase={publish.phase} hash={publish.hash} error={publish.error} />
        </div>
      )}

      {myLabel && (
        <div className="mt-4 rounded-2xl border border-line bg-surface/80 p-5 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <h2 className="font-semibold">Goal names</h2>
          <p className="mt-1 text-xs text-ink-mute">
            Each name is two transactions on Sepolia: the registration in your registry and the record pointing to
            the vault on Fuji.
          </p>
          {goals.isLoading && <p className="mt-3 text-sm text-ink-soft">Loading goals…</p>}
          {goals.data && goals.data.length === 0 && (
            <p className="mt-3 text-sm text-ink-mute">You have no goals on Fuji yet.</p>
          )}
          <ul className="mt-3 divide-y divide-line">
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
          className="mt-6 text-sm text-ink-mute underline decoration-dotted underline-offset-2 transition hover:text-ink"
          onClick={() => switchChain({ chainId: avalancheFuji.id })}
        >
          Back to Fuji
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
          <p className="text-xs text-ink-mute">{shortAddress(vault)}</p>
        </div>
        {done ? (
          <a
            className="font-mono text-xs text-brand-soft underline decoration-dotted"
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
            className="inline-flex items-center justify-center rounded-xl border border-line-strong bg-raised px-3 py-1.5 text-xs font-medium text-ink transition duration-150 ease-soft hover:border-ink-mute hover:bg-line disabled:cursor-not-allowed disabled:opacity-40"
          >
            Name it
          </button>
        ) : (
          <button
            onClick={onSetAddr}
            disabled={!canAct}
            className="inline-flex items-center justify-center rounded-xl border border-line-strong bg-raised px-3 py-1.5 text-xs font-medium text-ink transition duration-150 ease-soft hover:border-ink-mute hover:bg-line disabled:cursor-not-allowed disabled:opacity-40"
          >
            Link the vault
          </button>
        )}
      </div>
      <TxStatus phase={registerTx.phase} hash={registerTx.hash} error={registerTx.error} />
      <TxStatus phase={addrTx.phase} hash={addrTx.hash} error={addrTx.error} />
    </li>
  )
}
