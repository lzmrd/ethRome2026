# Formica M1 — Frontend Core (Fuji) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** web app Formica che gira su Avalanche Fuji: dashboard dei goal, creazione goal, checkout con round-up, incasso con round-down, dettaglio goal con withdraw e storico — tutto con tx reali contro i contratti M0 già deployati.

**Architecture:** SPA Vite + React + TypeScript, senza router library (hash router ~40 righe, così il back del browser funziona e non introduciamo dipendenze nuove). wagmi v3 + viem per letture/scritture, TanStack Query per cache/refetch. La matematica di anteprima NON è duplicata in TS: si legge dal `PaymentRouter` (`quoteRoundUp`/`quoteRoundDown`), unica fonte di verità on-chain. ENS è fuori scope M1 (arriva in M2): la label viene già normalizzata con `normalize()` per non rifare il lavoro.

**Tech Stack:** Vite 8, React 19, TypeScript 7, wagmi 3, viem 2, TanStack Query 5, Tailwind CSS 4, pnpm, Node 22.

**Spec:** `docs/superpowers/specs/2026-09-11-formica-design.md` (v0.3) — §5 contratti, §7 frontend e regole M1 (a)–(f), §9 checklist E2E, §11 M1.

## Global Constraints

- **wagmi è v3** (installata 3.7.7): usare i nomi v3, mai gli alias v2 deprecati.
  - `useConnection()` (non `useAccount`), `useConnectors()` (non `useConnect().connectors`), `useConnect().mutate({ connector })`, `useWriteContract().mutate(...)`/`mutateAsync(...)` (non `writeContract`), `useDisconnect().mutate()`, `useSwitchChain().mutate({ chainId })`.
  - I types installati sono la fonte di verità: se un type non torna, fare un cast ristretto al confine e **riportarlo**, non inventare API.
- **Mai stimare le fee**: ogni scrittura passa da `FEE_OVERRIDES` in `src/lib/tx.ts` (`maxPriorityFeePerGas: 1n`, `maxFeePerGas: 2000n`). Su Fuji la base fee è ~10 wei: lasciar stimare a viem brucia ~10⁷× AVAX in più.
- **Nessun framework di test frontend** (spec §9: scelta di tempo). Verifica per task = `pnpm build` (che esegue `tsc -b`) + smoke manuale in `pnpm dev`. Non aggiungere vitest.
- **Regole M1 della spec §7, da rispettare in ogni task:**
  - (a) saldo del goal = `maxWithdraw(owner)` (che in OpenZeppelin v5 = `convertToAssets(balanceOf(owner))` arrotondato per difetto); yield = `max(balance - netDeposited, 0n)`. **Mai** mostrare `convertToAssets(1 share)` né derivarne lo yield.
  - (b) prima di `createGoal`: normalizzare la label con `normalize()` (viem/ens), rifiutare label con `.`, rifiutare duplicati tra i goal dell'utente.
  - (c) niente toggle di modalità in M1 (nessuna UI cambia modalità): il vincolo è rispettato non esponendo il controllo.
  - (d) i revert di Aave diventano "Liquidità Aave / riserva non disponibile" (mappatura in `src/lib/errors.ts`).
  - (e) gli eventi si leggono da `DEPLOY_BLOCK` a chunk di 1024 blocchi (gli RPC pubblici Avalanche limitano `eth_getLogs`), filtrati per indirizzo del vault.
  - (f) fee minime esplicite (vedi sopra).
- **Mai mostrare o committare chiavi private.** L'indirizzo merchant per la demo arriva da `VITE_DEMO_MERCHANT` (è un indirizzo pubblico) in `frontend/.env.local`, gitignored. `.env.example` committato con i soli nomi.
- **Indirizzi Fuji** pinned in `frontend/src/config/addresses.ts` da `contracts/deployments/fuji.json` (factory `0xC3D3…84C4`, router `0x9014…1ed9`, USDC `0x5425…Bc65`, pool Aave `0x8B9b…bb40`, `deployBlock = 58324885`).
- **Niente ENS in M1**: nessuna risoluzione, nessun record, nessuna pagina proof. (M2, dopo il checkpoint di mezzogiorno.)
- **Commit piccoli, uno per task**, con push su `origin/main` a build verde. Trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` come in M0.
- **Scadenza M1: sab 12 set 13:00** (Europe/Rome). Se un task sfora, fermarsi e riportare invece di allargare lo scope.

## File Structure

```
frontend/
  .env.example                    # chiavi RPC + VITE_DEMO_MERCHANT (vuoto)
  .env.local                      # copia locale, gitignored
  index.html                      # title Formica
  vite.config.ts                  # plugin react + tailwind
  src/
    main.tsx                      # provider: WagmiProvider + QueryClientProvider
    App.tsx                       # shell + hash routing
    index.css                     # tailwind
    wagmi.ts                      # createConfig Fuji + Sepolia, RPC fallback
    config/
      addresses.ts                # indirizzi Fuji, deployBlock, explorer base
      abis.ts                     # parseAbi di erc20/factory/vault/router/pool
    lib/
      format.ts                   # formatUsdc, parseUsdc, shortAddress, formatDate
      errors.ts                   # humanizeTxError (revert ERC-20/4626/router/Aave)
      tx.ts                       # FEE_OVERRIDES + hook useTx (simulate→write→wait)
      hashRoute.ts                # useHashRoute
    hooks/
      useGoals.ts                 # useUserGoals, useVaultLabels, useGoalMeta, useGoalBalance
      useAaveApy.ts               # getReserveData → APY live
      useUsdc.ts                  # saldo, allowance, quote round-up/down
      useVaultEvents.ts           # eventi a chunk per il dettaglio goal
    components/
      Header.tsx                  # nav + connetti/disconnetti
      ChainGuard.tsx              # connetti wallet / switch a Fuji
      TxStatus.tsx                # pending → mined → error + link Snowtrace
      ProgressBar.tsx             # barra target
      GoalCard.tsx                # card dashboard (legge da sola i dati del vault)
    pages/
      Dashboard.tsx
      CreateGoal.tsx
      Spend.tsx
      Receive.tsx
      GoalDetail.tsx
docs/e2e-m1.md                    # checklist E2E manuale (Task 7)
```

---

### Task 0: Preflight operativo (utente, in parallelo)

Serve per lo smoke manuale (Task 1 e successivi) e per la checklist finale. Non blocca la scrittura del codice.

**Files:** nessuno (solo browser).

- [ ] **Step 1: Importa le due wallet demo nel browser wallet** (MetaMask o equivalente): `PRIVATE_KEY` (saver/Mario) e `MERCHANT_PRIVATE_KEY` (merchant/datore di lavoro) da `contracts/.env`. Aggiungi la rete Avalanche Fuji (chain id 43113). Mai incollare le chiavi altrove.
- [ ] **Step 2: Fondi la wallet merchant** con AVAX Fuji (gas) e ~10 USDC Fuji (faucet.circle.com). Il saver ha già AVAX/USDC dal M0.
- [ ] **Step 3: Ricava l'indirizzo pubblico del merchant e mettilo in `frontend/.env.local`** (verrà creato nel Task 1):

```bash
cd /home/revsurfer/projects/hacks/ethRome2026
MERCHANT=$(set -a; source contracts/.env; set +a; ~/.foundry/bin/cast wallet address --private-key "$MERCHANT_PRIVATE_KEY")
echo "VITE_DEMO_MERCHANT=$MERCHANT" >> frontend/.env.local
echo "merchant: $MERCHANT"   # solo l'indirizzo, nessuna chiave
```

Expected: stampa un indirizzo `0x…`. Se `frontend/.env.local` non esiste ancora, crealo prima nel Task 1 e torna qui.

---

### Task 1: Scaffold, fondamenta e shell

**Files:**
- Create: `frontend/` (scaffold Vite), `frontend/vite.config.ts`, `frontend/index.html` (modify), `frontend/src/index.css`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/wagmi.ts`, `frontend/src/config/addresses.ts`, `frontend/src/config/abis.ts`, `frontend/src/lib/format.ts`, `frontend/src/lib/errors.ts`, `frontend/src/lib/tx.ts`, `frontend/src/lib/hashRoute.ts`, `frontend/src/components/Header.tsx`, `frontend/src/components/ChainGuard.tsx`, `frontend/src/components/TxStatus.tsx`, `frontend/.env.example`, `frontend/.env.local` (gitignored), `.gitignore` (root, verifica)

**Interfaces:**
- Consumes: indirizzi e ABI dei contratti M0 (`contracts/deployments/fuji.json`, `contracts/src/`).
- Produces: `wagmiConfig`; `useTx()` → `{ phase, hash, error, run, reset, receipt }`; `FEE_OVERRIDES`; `humanizeTxError(error): string`; `formatUsdc(bigint, maxFractionDigits?): string`; `parseUsdc(string): bigint | undefined`; `shortAddress(string): string`; `useHashRoute()` → `{ route, navigate }`; componenti `Header`, `ChainGuard`, `TxStatus`, `ProgressBar`; ABIs `erc20Abi`, `factoryAbi`, `vaultAbi`, `routerAbi`, `poolAbi`; costanti `FACTORY`, `ROUTER`, `USDC`, `AAVE_POOL`, `DEPLOY_BLOCK`, `SNOWTRACE_TX`, `SNOWTRACE_ADDRESS`.

- [ ] **Step 1: Scaffold Vite e installa le dipendenze**

```bash
cd /home/revsurfer/projects/hacks/ethRome2026
pnpm create vite frontend --template react-ts
cd frontend && pnpm install
pnpm add wagmi@3 viem@2 @tanstack/react-query@5 tailwindcss@4 @tailwindcss/vite@4
pnpm list wagmi viem @tanstack/react-query tailwindcss
```

Expected: wagmi `3.x`, viem `2.x`, `@tanstack/react-query` `5.x`, tailwindcss `4.x`. Se wagmi installa <3, fermarsi e riportare.

- [ ] **Step 2: Sostituisci `frontend/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 3: Sostituisci `frontend/src/index.css`**

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background-color: #0a0a0a;
  color: #fafafa;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
```

- [ ] **Step 4: Crea `frontend/src/config/addresses.ts`**

```ts
import type { Address } from 'viem'

export const FUJI_CHAIN_ID = 43113

// contracts/deployments/fuji.json (deploy 2026-09-12)
export const FACTORY: Address = '0xC3D34b01581137Baf4e0e332E9b4cC2755aB84C4'
export const ROUTER: Address = '0x901421967256d1eB181902Db7A24f07428791ed9'
export const USDC: Address = '0x5425890298aed601595a70AB815c96711a31Bc65'
export const AAVE_POOL: Address = '0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40'
export const DEPLOY_BLOCK = 58324885n

export const SNOWTRACE_TX = 'https://testnet.snowtrace.io/tx/'
export const SNOWTRACE_ADDRESS = 'https://testnet.snowtrace.io/address/'
```

- [ ] **Step 5: Crea `frontend/src/config/abis.ts`**

```ts
import { parseAbi } from 'viem'

export const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
])

export const factoryAbi = parseAbi([
  'function goalsOf(address owner) view returns (address[])',
  'function isVault(address vault) view returns (bool)',
  'function createGoal(string label, uint8 mode, uint8 multiplier, uint256 target) returns (address)',
  'event GoalCreated(address indexed owner, address indexed vault, string label)',
])

export const vaultAbi = parseAbi([
  'function owner() view returns (address)',
  'function label() view returns (string)',
  'function mode() view returns (uint8)',
  'function multiplier() view returns (uint8)',
  'function target() view returns (uint256)',
  'function netDeposited() view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function maxWithdraw(address owner) view returns (uint256)',
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)',
])

export const routerAbi = parseAbi([
  'function quoteRoundUp(uint256 amount, uint8 multiplier) pure returns (uint256)',
  'function quoteRoundDown(uint256 amount, uint8 multiplier) pure returns (uint256)',
  'function payWithRoundUp(address merchant, uint256 amount, address vault) returns (uint256)',
  'function receiveWithRoundDown(uint256 amount, address vault) returns (uint256)',
])

export const poolAbi = parseAbi([
  'function getReserveData(address asset) view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
])
```

Nota: la struct `ReserveData` è stata verificata on-chain il 2026-09-12 con viem (`currentLiquidityRate` letto = `1343285538296904042923245`, APR 0,134%). Non modificarla.

- [ ] **Step 6: Crea `frontend/src/lib/format.ts`**

```ts
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
```

- [ ] **Step 7: Crea `frontend/src/lib/errors.ts`**

```ts
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
```

- [ ] **Step 8: Crea `frontend/src/lib/tx.ts`**

```ts
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
      const { request } = await publicClient.simulateContract({ ...params, ...FEE_OVERRIDES })
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
```

- [ ] **Step 9: Crea `frontend/src/lib/hashRoute.ts`**

```ts
import { useEffect, useState } from 'react'

export type Route =
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'spend' }
  | { name: 'receive' }
  | { name: 'goal'; address: string }

function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [head, param] = path.split('/')
  switch (head) {
    case 'create':
      return { name: 'create' }
    case 'spend':
      return { name: 'spend' }
    case 'receive':
      return { name: 'receive' }
    case 'goal':
      return param ? { name: 'goal', address: param } : { name: 'dashboard' }
    default:
      return { name: 'dashboard' }
  }
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    function onChange() {
      setRoute(parseHash(window.location.hash))
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  function navigate(path: string) {
    window.location.hash = path
  }

  return { route, navigate }
}
```

- [ ] **Step 10: Crea `frontend/src/wagmi.ts`**

```ts
import { createConfig, fallback, http } from 'wagmi'
import { injected } from 'wagmi'
import { avalancheFuji, sepolia } from 'wagmi/chains'

const fujiUrl = import.meta.env.VITE_FUJI_RPC_URL as string | undefined
const fujiFallbackUrl = import.meta.env.VITE_FUJI_RPC_URL_FALLBACK as string | undefined
const sepoliaUrl = import.meta.env.VITE_SEPOLIA_RPC_URL as string | undefined

export const wagmiConfig = createConfig({
  chains: [avalancheFuji, sepolia],
  connectors: [injected()],
  transports: {
    [avalancheFuji.id]: fallback([
      http(fujiUrl || 'https://api.avax-test.network/ext/bc/C/rpc'),
      http(fujiFallbackUrl || 'https://avalanche-fuji-c-chain-rpc.publicnode.com'),
    ]),
    [sepolia.id]: http(sepoliaUrl || 'https://ethereum-sepolia-rpc.publicnode.com'),
  },
})
```

- [ ] **Step 11: Crea `frontend/src/components/ChainGuard.tsx`**

```tsx
import type { ReactNode } from 'react'
import { useConnect, useConnection, useConnectors, useSwitchChain } from 'wagmi'
import { avalancheFuji } from 'wagmi/chains'
import { FUJI_CHAIN_ID } from '../config/addresses'

export function ChainGuard({ children }: { children: ReactNode }) {
  const connection = useConnection()
  const connect = useConnect()
  const connectors = useConnectors()
  const { mutate: switchChain, isPending } = useSwitchChain()

  if (!connection.isConnected) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <h2 className="text-lg font-semibold">Connetti un wallet</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Formica usa USDC di test su Avalanche Fuji. Importa la wallet demo nel browser.
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

  if (connection.chainId !== FUJI_CHAIN_ID) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <h2 className="text-lg font-semibold">Rete sbagliata</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Sei sulla chain {connection.chainId}. Formica usa Avalanche Fuji ({FUJI_CHAIN_ID}).
        </p>
        <button
          className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-50"
          disabled={isPending}
          onClick={() => switchChain({ chainId: avalancheFuji.id })}
        >
          Passa a Fuji
        </button>
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 12: Crea `frontend/src/components/TxStatus.tsx`**

```tsx
import type { Hex } from 'viem'
import { SNOWTRACE_TX } from '../config/addresses'
import type { TxPhase } from '../lib/tx'

const LABELS: Record<TxPhase, string> = {
  idle: '',
  simulating: 'Verifica della transazione…',
  signing: 'Firma nel wallet…',
  mining: 'In attesa di conferma…',
  success: 'Transazione confermata',
  error: 'Errore',
}

export function TxStatus({ phase, hash, error }: { phase: TxPhase; hash?: Hex; error?: string }) {
  if (phase === 'idle') return null
  const color =
    phase === 'error' ? 'text-red-400' : phase === 'success' ? 'text-emerald-400' : 'text-amber-300'
  return (
    <div className={`mt-3 text-sm ${color}`}>
      <p>{phase === 'error' ? error : LABELS[phase]}</p>
      {hash && (
        <a
          className="underline decoration-dotted"
          href={`${SNOWTRACE_TX}${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          {hash.slice(0, 10)}…{hash.slice(-8)}
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 13: Crea `frontend/src/components/ProgressBar.tsx`**

```tsx
export function ProgressBar({ value }: { value?: number }) {
  const width = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
      <div className="h-full rounded-full bg-amber-500" style={{ width: `${width}%` }} />
    </div>
  )
}
```

- [ ] **Step 14: Crea `frontend/src/components/Header.tsx`**

```tsx
import { useConnection, useDisconnect } from 'wagmi'
import type { Route } from '../lib/hashRoute'
import { shortAddress } from '../lib/format'

const TABS: { label: string; path: string; route: Route['name'] }[] = [
  { label: 'Dashboard', path: '/', route: 'dashboard' },
  { label: 'Crea goal', path: '/create', route: 'create' },
  { label: 'Spendi', path: '/spend', route: 'spend' },
  { label: 'Incassa', path: '/receive', route: 'receive' },
]

export function Header({ current, navigate }: { current: Route['name']; navigate: (path: string) => void }) {
  const connection = useConnection()
  const disconnect = useDisconnect()

  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <button className="text-lg font-bold" onClick={() => navigate('/')}>
          Formica
        </button>
        <nav className="hidden gap-1 sm:flex">
          {TABS.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                current === tab.route ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="text-sm text-neutral-400">
          {connection.isConnected && connection.address ? (
            <button onClick={() => disconnect.mutate()} className="hover:text-white">
              {shortAddress(connection.address)} · esci
            </button>
          ) : (
            'non connesso'
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 15: Sostituisci `frontend/src/App.tsx`** (shell con placeholder dashboard; le pagine arrivano nei task successivi)

```tsx
import { ChainGuard } from './components/ChainGuard'
import { Header } from './components/Header'
import { useHashRoute } from './lib/hashRoute'

export function App() {
  const { route, navigate } = useHashRoute()

  return (
    <div className="min-h-screen">
      <Header current={route.name} navigate={navigate} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ChainGuard>
          <p className="text-sm text-neutral-400">Dashboard in arrivo nel prossimo task.</p>
          {route.name === 'goal' && <p className="mt-2 text-xs text-neutral-500">goal {route.address}</p>}
        </ChainGuard>
      </main>
    </div>
  )
}
```

- [ ] **Step 16: Sostituisci `frontend/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { App } from './App'
import { wagmiConfig } from './wagmi'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
```

- [ ] **Step 17: Aggiorna il title in `frontend/index.html`** — `<title>Formica</title>` e `lang="en"`.

- [ ] **Step 18: Crea `frontend/.env.example` e `frontend/.env.local`**

`frontend/.env.example`:
```
VITE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
VITE_FUJI_RPC_URL_FALLBACK=https://avalanche-fuji-c-chain-rpc.publicnode.com
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_DEMO_MERCHANT=
```

```bash
cd /home/revsurfer/projects/hacks/ethRome2026/frontend
cp .env.example .env.local
cd .. && git check-ignore frontend/.env.local && echo "OK: .env.local ignorato"
```

Expected: `OK: .env.local ignorato`. Se non è ignorato, aggiungi `frontend/.env.local` al `.gitignore` di root.

- [ ] **Step 19: Build**

Run: `cd frontend && pnpm build`
Expected: `tsc -b` senza errori e `vite build` con `✓ built in …`. Se TypeScript segnala errori di tipo su wagmi, correggere con cast ristretto al confine e annotare nel report.

- [ ] **Step 20: Smoke manuale dev server**

Run: `cd frontend && pnpm dev` e apri `http://localhost:5173`.
Expected: header Formica con tab; pulsante "Connetti un wallet" che elenca il connector injected; dopo la connessione su Fuji si vede il placeholder; su rete diversa appare "Passa a Fuji". (Il task può essere chiuso anche senza wallet: la verifica minima è che la schermata di connessione renderizzi.)

- [ ] **Step 21: Commit e push**

```bash
git add frontend .gitignore
git status --short   # verifica: nessun .env o .env.local nella lista
git commit -m "frontend: Vite+wagmi v3 scaffold, Fuji config, tx/error foundations, shell

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 2: Dashboard

**Files:**
- Create: `frontend/src/hooks/useGoals.ts`, `frontend/src/hooks/useAaveApy.ts`, `frontend/src/components/GoalCard.tsx`, `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `factoryAbi`, `vaultAbi`, `poolAbi`, indirizzi, `formatUsdc`, `shortAddress`, `useHashRoute` route/navigate.
- Produces:
  - `useUserGoals(owner?: Address)` → `useReadContract` con `data: readonly Address[] | undefined` (refetch ogni 15s).
  - `useVaultLabels(vaults: readonly Address[])` → `{ labels: (string | undefined)[]; isLoading: boolean }` (per i picker e per il gate duplicati).
  - `useGoalMeta(vault?: Address)` → `{ isLoading, owner?, label?, mode?, multiplier?, target?, netDeposited? }`.
  - `useGoalBalance(vault?: Address, owner?: Address)` → `{ isLoading, balance?, shares?, refetch() }` dove `balance = maxWithdraw(owner)` (regola a).
  - `useAaveApy()` → `number | undefined` (percentuale già moltiplicata, es. `0.13`).
  - `GoalCard({ vault, navigate, apy? })`, `Dashboard({ navigate })`.

- [ ] **Step 1: Crea `frontend/src/hooks/useGoals.ts`**

```ts
import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { factoryAbi, vaultAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'

export function useUserGoals(owner?: Address) {
  return useReadContract({
    address: FACTORY,
    abi: factoryAbi,
    functionName: 'goalsOf',
    args: owner ? [owner] : undefined,
    query: { enabled: Boolean(owner), refetchInterval: 15_000 },
  })
}

export function useVaultLabels(vaults: readonly Address[]) {
  const query = useReadContracts({
    contracts: vaults.map((vault) => ({ address: vault, abi: vaultAbi, functionName: 'label' }) as const),
    query: { enabled: vaults.length > 0 },
  })
  return (query.data ?? []).map((result) => (result.status === 'success' ? result.result : undefined))
}

export function useGoalMeta(vault?: Address) {
  const enabled = Boolean(vault)
  const owner = useReadContract({ address: vault, abi: vaultAbi, functionName: 'owner', query: { enabled } })
  const label = useReadContract({ address: vault, abi: vaultAbi, functionName: 'label', query: { enabled } })
  const mode = useReadContract({ address: vault, abi: vaultAbi, functionName: 'mode', query: { enabled } })
  const multiplier = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'multiplier',
    query: { enabled },
  })
  const target = useReadContract({ address: vault, abi: vaultAbi, functionName: 'target', query: { enabled } })
  const netDeposited = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'netDeposited',
    query: { enabled },
  })

  return {
    isLoading: [owner, label, mode, multiplier, target, netDeposited].some((q) => q.isLoading),
    owner: owner.data,
    label: label.data,
    mode: mode.data,
    multiplier: multiplier.data,
    target: target.data,
    netDeposited: netDeposited.data,
  }
}

export function useGoalBalance(vault?: Address, owner?: Address) {
  const enabled = Boolean(vault && owner)
  const balance = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'maxWithdraw',
    args: owner ? [owner] : undefined,
    query: { enabled, refetchInterval: 15_000 },
  })
  const shares = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: { enabled, refetchInterval: 15_000 },
  })

  return {
    isLoading: balance.isLoading || shares.isLoading,
    balance: balance.data,
    shares: shares.data,
    refetch: () => {
      void balance.refetch()
      void shares.refetch()
    },
  }
}
```

- [ ] **Step 2: Crea `frontend/src/hooks/useAaveApy.ts`**

```ts
import { useReadContract } from 'wagmi'
import { poolAbi } from '../config/abis'
import { AAVE_POOL, USDC } from '../config/addresses'

const SECONDS_PER_YEAR = 31_536_000

export function useAaveApy(): number | undefined {
  const query = useReadContract({
    address: AAVE_POOL,
    abi: poolAbi,
    functionName: 'getReserveData',
    args: [USDC],
    query: { staleTime: 60_000, refetchInterval: 120_000 },
    select: (data) => {
      const apr = Number(data.currentLiquidityRate) / 1e27
      return (Math.pow(1 + apr / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1) * 100
    },
  })
  return query.data
}
```

- [ ] **Step 3: Crea `frontend/src/components/GoalCard.tsx`**

```tsx
import type { Address } from 'viem'
import { ProgressBar } from './ProgressBar'
import { formatUsdc, shortAddress } from '../lib/format'
import { useGoalBalance, useGoalMeta } from '../hooks/useGoals'

export function GoalCard({
  vault,
  apy,
  navigate,
}: {
  vault: Address
  apy?: number
  navigate: (path: string) => void
}) {
  const meta = useGoalMeta(vault)
  const { balance } = useGoalBalance(vault, meta.owner)

  const earned =
    balance !== undefined && meta.netDeposited !== undefined
      ? balance > meta.netDeposited
        ? balance - meta.netDeposited
        : 0n
      : undefined
  const progress =
    balance !== undefined && meta.target !== undefined && meta.target > 0n
      ? Number((balance * 10_000n) / meta.target) / 100
      : undefined

  return (
    <button
      onClick={() => navigate(`/goal/${vault}`)}
      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-left transition hover:border-neutral-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{meta.label ?? shortAddress(vault)}</h3>
          <p className="text-xs text-neutral-500">{shortAddress(vault)}</p>
        </div>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
          {meta.mode === 1 ? 'Yield · Aave' : 'Liquid'} · x{meta.multiplier ?? '-'}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <p className="text-2xl font-bold">
          {balance === undefined ? '…' : `${formatUsdc(balance)} USDC`}
        </p>
        <p className="text-xs text-neutral-400">
          {meta.target !== undefined && meta.target > 0n
            ? `target ${formatUsdc(meta.target)} USDC`
            : 'nessun target'}
        </p>
      </div>

      <div className="mt-3">
        <ProgressBar value={progress} />
      </div>

      <div className="mt-3 flex justify-between text-xs text-neutral-400">
        <span>yield {earned === undefined ? '…' : `+${formatUsdc(earned, 4)} USDC`}</span>
        {meta.mode === 1 && apy !== undefined && <span>Aave APY {apy.toFixed(2)}%</span>}
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Crea `frontend/src/pages/Dashboard.tsx`**

```tsx
import { useConnection, useWatchContractEvent } from 'wagmi'
import { factoryAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'
import { GoalCard } from '../components/GoalCard'
import { useAaveApy } from '../hooks/useAaveApy'
import { useUserGoals } from '../hooks/useGoals'

export function Dashboard({ navigate }: { navigate: (path: string) => void }) {
  const connection = useConnection()
  const owner = connection.address
  const goals = useUserGoals(owner)
  const apy = useAaveApy()

  useWatchContractEvent({
    address: FACTORY,
    abi: factoryAbi,
    eventName: 'GoalCreated',
    onLogs: () => {
      void goals.refetch()
    },
  })

  const vaults = goals.data ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">I tuoi goal</h1>
          <p className="text-sm text-neutral-400">
            {apy === undefined
              ? 'Aave V3: lettura del tasso…'
              : `Aave V3 supply APY: ${apy.toFixed(2)}% (testnet, live)`}
          </p>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950"
        >
          Nuovo goal
        </button>
      </div>

      {goals.isLoading && <p className="mt-8 text-sm text-neutral-400">Lettura goal…</p>}

      {!goals.isLoading && vaults.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-700 p-8 text-center">
          <p className="text-neutral-300">Nessun goal ancora.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Crea il primo: ogni goal è un vault ERC-4626 separato.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {vaults.map((vault) => (
          <GoalCard key={vault} vault={vault} apy={apy} navigate={navigate} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Modifica `frontend/src/App.tsx`** — aggiungi l'import e il branch dashboard:

```tsx
import { ChainGuard } from './components/ChainGuard'
import { Header } from './components/Header'
import { useHashRoute } from './lib/hashRoute'
import { Dashboard } from './pages/Dashboard'

export function App() {
  const { route, navigate } = useHashRoute()

  return (
    <div className="min-h-screen">
      <Header current={route.name} navigate={navigate} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ChainGuard>
          {route.name === 'dashboard' && <Dashboard navigate={navigate} />}
          {route.name !== 'dashboard' && (
            <p className="text-sm text-neutral-400">Pagina non ancora implementata.</p>
          )}
        </ChainGuard>
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Verifica build**

Run: `cd frontend && pnpm build`
Expected: build verde.

- [ ] **Step 7: Smoke manuale**

Con `pnpm dev`: connetti il saver su Fuji. Expected: il goal "smoke" creato in M0 (o i goal esistenti) appare in dashboard con saldo ~0 e label "smoke"; il tasso Aave compare in alto (~0,13%); nessun errore in console. Se `goalsOf` è vuoto per la wallet connessa, crea un goal in M0 o usa la wallet che ne ha uno.

- [ ] **Step 8: Commit e push**

```bash
git add frontend/src
git commit -m "frontend: dashboard with per-goal vault reads and live Aave APY

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 3: Creazione goal

**Files:**
- Create: `frontend/src/pages/CreateGoal.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useTx`, `TxStatus`, `factoryAbi`, `FACTORY`, `useUserGoals`, `useVaultLabels`, `parseUsdc`, `normalize` (viem/ens), `decodeEventLog` (viem).
- Produces: pagina `CreateGoal({ navigate })` che crea il vault e naviga a `#/goal/<vault>` a ricevuta confermata.

- [ ] **Step 1: Crea `frontend/src/pages/CreateGoal.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { decodeEventLog, isAddress, type Address } from 'viem'
import { normalize } from 'viem/ens'
import { useConnection } from 'wagmi'
import { factoryAbi } from '../config/abis'
import { FACTORY } from '../config/addresses'
import { TxStatus } from '../components/TxStatus'
import { useUserGoals, useVaultLabels } from '../hooks/useGoals'
import { formatUsdc, parseUsdc } from '../lib/format'
import { useTx } from '../lib/tx'

function normalizeLabel(input: string): string | undefined {
  const trimmed = input.trim()
  if (!trimmed || trimmed.includes('.')) return undefined
  try {
    return normalize(trimmed)
  } catch {
    return undefined
  }
}

export function CreateGoal({ navigate }: { navigate: (path: string) => void }) {
  const connection = useConnection()
  const owner = connection.address

  const [labelInput, setLabelInput] = useState('')
  const [mode, setMode] = useState(0)
  const [multiplier, setMultiplier] = useState(3)
  const [targetInput, setTargetInput] = useState('20')

  const goals = useUserGoals(owner)
  const existingLabels = useVaultLabels(goals.data ?? [])

  const { phase, hash, error, run, receipt } = useTx()

  const label = normalizeLabel(labelInput)
  const target = targetInput.trim() === '' ? 0n : parseUsdc(targetInput)
  const duplicate = label !== undefined && existingLabels.some((existing) => existing === label)
  const multiplierValid = Number.isInteger(multiplier) && multiplier >= 1 && multiplier <= 10
  const canSubmit =
    Boolean(owner) &&
    label !== undefined &&
    !duplicate &&
    multiplierValid &&
    target !== undefined &&
    !['simulating', 'signing', 'mining'].includes(phase)

  useEffect(() => {
    if (phase !== 'success' || !receipt.data) return
    for (const log of receipt.data.logs) {
      try {
        const decoded = decodeEventLog({
          abi: factoryAbi,
          eventName: 'GoalCreated',
          data: log.data,
          topics: log.topics,
        })
        const vault = decoded.args.vault as Address
        if (isAddress(vault)) {
          navigate(`/goal/${vault}`)
          return
        }
      } catch {
        // log di un altro contratto nella stessa ricevuta
      }
    }
  }, [phase, receipt.data, navigate])

  async function onSubmit() {
    if (!owner || !label || target === undefined) return
    await run({
      account: owner,
      address: FACTORY,
      abi: factoryAbi,
      functionName: 'createGoal',
      args: [label, mode, multiplier, target],
    })
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">Crea un goal</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Ogni goal è un vault ERC-4626 separato. Il nome verrà usato come subname ENS in M2.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-300">Nome</span>
          <input
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            placeholder="vacanza"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
          />
          {labelInput.trim() !== '' && label === undefined && (
            <span className="mt-1 block text-xs text-red-400">
              Nome non valido: minuscole, numeri e trattini; niente punti.
            </span>
          )}
          {duplicate && <span className="mt-1 block text-xs text-red-400">Hai già un goal con questo nome.</span>}
          {label !== undefined && !duplicate && (
            <span className="mt-1 block text-xs text-neutral-500">nome normalizzato: {label}</span>
          )}
        </label>

        <fieldset>
          <legend className="text-sm text-neutral-300">Modalità</legend>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setMode(0)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                mode === 0 ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
              }`}
            >
              Liquid (nessun rischio)
            </button>
            <button
              type="button"
              onClick={() => setMode(1)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                mode === 1 ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-700'
              }`}
            >
              Yield (Aave V3)
            </button>
          </div>
        </fieldset>

        <div className="flex gap-4">
          <label className="block flex-1">
            <span className="text-sm text-neutral-300">Moltiplicatore (1-10)</span>
            <input
              type="number"
              min={1}
              max={10}
              value={multiplier}
              onChange={(event) => setMultiplier(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
            />
            {!multiplierValid && <span className="mt-1 block text-xs text-red-400">Da 1 a 10.</span>}
          </label>
          <label className="block flex-1">
            <span className="text-sm text-neutral-300">Target in USDC (opzionale)</span>
            <input
              value={targetInput}
              onChange={(event) => setTargetInput(event.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
            />
            {targetInput.trim() !== '' && target === undefined && (
              <span className="mt-1 block text-xs text-red-400">Importo non valido.</span>
            )}
          </label>
        </div>

        <div className="rounded-lg bg-neutral-900 p-3 text-xs text-neutral-400">
          Anteprima: {label ?? '…'} · {mode === 1 ? 'Yield su Aave' : 'Liquid'} · x{multiplier} · target{' '}
          {target === undefined ? '…' : `${formatUsdc(target)} USDC`}
        </div>

        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-40"
        >
          Crea goal su Fuji
        </button>

        <TxStatus phase={phase} hash={hash} error={error} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modifica `frontend/src/App.tsx`** — aggiungi l'import e il branch:

```tsx
import { ChainGuard } from './components/ChainGuard'
import { Header } from './components/Header'
import { useHashRoute } from './lib/hashRoute'
import { CreateGoal } from './pages/CreateGoal'
import { Dashboard } from './pages/Dashboard'

export function App() {
  const { route, navigate } = useHashRoute()

  return (
    <div className="min-h-screen">
      <Header current={route.name} navigate={navigate} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ChainGuard>
          {route.name === 'dashboard' && <Dashboard navigate={navigate} />}
          {route.name === 'create' && <CreateGoal navigate={navigate} />}
          {route.name === 'goal' && (
            <p className="text-sm text-neutral-400">
              Dettaglio goal in arrivo (vault {route.address}).
            </p>
          )}
        </ChainGuard>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Verifica build**

Run: `cd frontend && pnpm build`
Expected: build verde.

- [ ] **Step 4: Smoke manuale**

`pnpm dev`, connetti il saver su Fuji, crea `prova-m1` x3 Yield target 20. Expected: dopo la firma si viene portati a `#/goal/0x…` (placeholder) e la tx è su Snowtrace. La dashboard al ritorno mostra il nuovo goal. Prova anche label con punto o duplicata: il pulsante resta disabilitato.

- [ ] **Step 5: Commit e push**

```bash
git add frontend/src
git commit -m "frontend: create goal form with normalized labels and duplicate check

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 4: Checkout (spendi con round-up)

**Files:**
- Create: `frontend/src/hooks/useUsdc.ts`, `frontend/src/pages/Spend.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `erc20Abi`, `routerAbi`, `ROUTER`, `USDC`, `useUserGoals`, `useVaultLabels`, `useGoalMeta`, `useTx`, `TxStatus`, `parseUsdc`, `formatUsdc`, `isAddress`, `maxUint256`.
- Produces:
  - `useUsdcBalance(owner?)` → `{ data?: bigint, refetch() }`.
  - `useRouterAllowance(owner?)` → `{ data?: bigint, refetch() }`.
  - `useRoundUpQuote(amount?, multiplier?)`, `useRoundDownQuote(amount?, multiplier?)` → `{ data?: bigint }`.
  - `Spend()`.

- [ ] **Step 1: Crea `frontend/src/hooks/useUsdc.ts`**

```ts
import type { Address } from 'viem'
import { useReadContract } from 'wagmi'
import { erc20Abi, routerAbi } from '../config/abis'
import { ROUTER, USDC } from '../config/addresses'

export function useUsdcBalance(owner?: Address) {
  return useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: { enabled: Boolean(owner), refetchInterval: 15_000 },
  })
}

export function useRouterAllowance(owner?: Address) {
  return useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner ? [owner, ROUTER] : undefined,
    query: { enabled: Boolean(owner), refetchInterval: 15_000 },
  })
}

export function useRoundUpQuote(amount?: bigint, multiplier?: number) {
  const enabled = amount !== undefined && multiplier !== undefined
  return useReadContract({
    address: ROUTER,
    abi: routerAbi,
    functionName: 'quoteRoundUp',
    args: enabled ? [amount, multiplier] : undefined,
    query: { enabled },
  })
}

export function useRoundDownQuote(amount?: bigint, multiplier?: number) {
  const enabled = amount !== undefined && multiplier !== undefined
  return useReadContract({
    address: ROUTER,
    abi: routerAbi,
    functionName: 'quoteRoundDown',
    args: enabled ? [amount, multiplier] : undefined,
    query: { enabled },
  })
}
```

- [ ] **Step 2: Crea `frontend/src/pages/Spend.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { isAddress, maxUint256, type Address } from 'viem'
import { useConnection } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi, routerAbi } from '../config/abis'
import { ROUTER, USDC } from '../config/addresses'
import { TxStatus } from '../components/TxStatus'
import { useUserGoals, useVaultLabels, useGoalMeta } from '../hooks/useGoals'
import { useRoundUpQuote, useRouterAllowance, useUsdcBalance } from '../hooks/useUsdc'
import { formatUsdc, parseUsdc } from '../lib/format'
import { useTx } from '../lib/tx'

export function Spend() {
  const connection = useConnection()
  const owner = connection.address
  const queryClient = useQueryClient()

  const goals = useUserGoals(owner)
  const vaults = goals.data ?? []
  const { labels } = useVaultLabels(vaults)

  const [selected, setSelected] = useState<Address>()
  const [amountInput, setAmountInput] = useState('')
  const [merchantInput, setMerchantInput] = useState(
    (import.meta.env.VITE_DEMO_MERCHANT as string | undefined) ?? '',
  )

  useEffect(() => {
    if (!selected && vaults.length > 0) setSelected(vaults[0])
  }, [selected, vaults])

  const meta = useGoalMeta(selected)
  const amount = parseUsdc(amountInput)
  const quote = useRoundUpQuote(amount, meta.multiplier)
  const saving = quote.data
  const total = amount !== undefined && saving !== undefined ? amount + saving : undefined

  const balance = useUsdcBalance(owner)
  const allowance = useRouterAllowance(owner)
  const merchantValid = merchantInput.trim() !== '' && isAddress(merchantInput.trim())
  const merchant = merchantValid ? (merchantInput.trim() as Address) : undefined

  const needsApproval =
    total !== undefined && allowance.data !== undefined ? allowance.data < total : undefined
  const insufficient = total !== undefined && balance.data !== undefined ? balance.data < total : undefined

  const approval = useTx()
  const payment = useTx()

  useEffect(() => {
    if (approval.phase === 'success') void queryClient.invalidateQueries()
  }, [approval.phase, queryClient])

  useEffect(() => {
    if (payment.phase === 'success') void queryClient.invalidateQueries()
  }, [payment.phase, queryClient])

  const canApprove =
    Boolean(owner) && needsApproval === true && !['simulating', 'signing', 'mining'].includes(approval.phase)
  const canPay =
    Boolean(owner && selected && merchant) &&
    amount !== undefined &&
    amount > 0n &&
    total !== undefined &&
    needsApproval === false &&
    insufficient === false &&
    !['simulating', 'signing', 'mining'].includes(payment.phase)

  async function onApprove() {
    if (!owner) return
    await approval.run({
      account: owner,
      address: USDC,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, maxUint256],
    })
  }

  async function onPay() {
    if (!owner || !selected || !merchant || amount === undefined) return
    await payment.run({
      account: owner,
      address: ROUTER,
      abi: routerAbi,
      functionName: 'payWithRoundUp',
      args: [merchant, amount, selected],
    })
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">Spendi</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Paghi il merchant e il round-up finisce nel tuo goal, in una sola transazione.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-300">Goal</span>
          <select
            value={selected ?? ''}
            onChange={(event) => setSelected(event.target.value as Address)}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
          >
            {vaults.map((vault, index) => (
              <option key={vault} value={vault}>
                {labels[index] ?? vault}
              </option>
            ))}
          </select>
          {meta.multiplier !== undefined && (
            <span className="mt-1 block text-xs text-neutral-500">moltiplicatore x{meta.multiplier}</span>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-neutral-300">Importo (USDC)</span>
          <input
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="4.30"
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
          />
        </label>

        <label className="block">
          <span className="text-sm text-neutral-300">Merchant</span>
          <input
            value={merchantInput}
            onChange={(event) => setMerchantInput(event.target.value)}
            placeholder="0x…"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs outline-none focus:border-amber-500"
          />
          {merchantInput.trim() !== '' && !merchantValid && (
            <span className="mt-1 block text-xs text-red-400">Indirizzo non valido.</span>
          )}
        </label>

        <div className="rounded-lg bg-neutral-900 p-3 text-sm">
          {amount === undefined || saving === undefined || total === undefined ? (
            <p className="text-neutral-500">Inserisci un importo per l'anteprima.</p>
          ) : (
            <ul className="space-y-1 text-neutral-300">
              <li className="flex justify-between">
                <span>Merchant</span>
                <span>{formatUsdc(amount)} USDC</span>
              </li>
              <li className="flex justify-between">
                <span>Risparmio nel goal</span>
                <span className="text-amber-400">+{formatUsdc(saving)} USDC</span>
              </li>
              <li className="flex justify-between border-t border-neutral-800 pt-1 font-medium">
                <span>Addebito totale</span>
                <span>{formatUsdc(total)} USDC</span>
              </li>
            </ul>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          Saldo: {balance.data === undefined ? '…' : `${formatUsdc(balance.data)} USDC`}
        </p>

        {insufficient === true && <p className="text-xs text-red-400">Saldo USDC insufficiente per pagamento + risparmio.</p>}

        {needsApproval === true && (
          <button
            onClick={onApprove}
            disabled={!canApprove}
            className="w-full rounded-lg border border-amber-500 px-4 py-2 font-medium text-amber-400 disabled:opacity-40"
          >
            Approva USDC per il router
          </button>
        )}
        <TxStatus phase={approval.phase} hash={approval.hash} error={approval.error} />

        <button
          onClick={onPay}
          disabled={!canPay}
          className="w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-40"
        >
          Paga e risparmia
        </button>
        <TxStatus phase={payment.phase} hash={payment.hash} error={payment.error} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Modifica `frontend/src/App.tsx`** — aggiungi:

```tsx
import { Spend } from './pages/Spend'
```

e il branch:

```tsx
{route.name === 'spend' && <Spend />}
```

(il branch `goal` resta il placeholder del Task 3)

- [ ] **Step 4: Verifica build**

Run: `cd frontend && pnpm build`
Expected: build verde.

- [ ] **Step 5: Smoke manuale**

`pnpm dev` con il saver: seleziona un goal, importo `4.30`, merchant = indirizzo merchant da `.env.local`. Expected anteprima: merchant 4.30, risparmio 2.10, totale 6.40. Al primo giro chiede l'approve; poi "Paga e risparmia" deve produrre una tx `PaymentRounded` su Snowtrace; saldo merchant +4.30 e goal +2.10 (visibile in dashboard). Importo `5.00` → risparmio 0.

- [ ] **Step 6: Commit e push**

```bash
git add frontend/src
git commit -m "frontend: spend checkout with on-chain round-up quote and approve flow

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 5: Incassa (round-down sulle entrate)

**Files:**
- Create: `frontend/src/pages/Receive.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `factoryAbi`, `routerAbi`, `FACTORY`, `ROUTER`, `USDC`, `useGoalMeta`, `useUsdcBalance`, `useRouterAllowance`, `useRoundDownQuote`, `useTx`, `TxStatus`, `parseUsdc`, `formatUsdc`, `shortAddress`, `isAddress`, `maxUint256`.
- Produces: `Receive()` — il pagatore connesso versa un lordo al proprietario del vault, il round-down va nel goal.

- [ ] **Step 1: Crea `frontend/src/pages/Receive.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { isAddress, maxUint256, type Address } from 'viem'
import { useConnection, useReadContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi, factoryAbi, routerAbi } from '../config/abis'
import { FACTORY, ROUTER, USDC } from '../config/addresses'
import { TxStatus } from '../components/TxStatus'
import { useGoalMeta } from '../hooks/useGoals'
import { useRoundDownQuote, useRouterAllowance, useUsdcBalance } from '../hooks/useUsdc'
import { formatUsdc, parseUsdc, shortAddress } from '../lib/format'
import { useTx } from '../lib/tx'

export function Receive() {
  const connection = useConnection()
  const payer = connection.address
  const queryClient = useQueryClient()

  const [vaultInput, setVaultInput] = useState('')
  const [amountInput, setAmountInput] = useState('')

  const vaultValid = isAddress(vaultInput.trim())
  const vault = vaultValid ? (vaultInput.trim() as Address) : undefined

  const isVault = useReadContract({
    address: FACTORY,
    abi: factoryAbi,
    functionName: 'isVault',
    args: vault ? [vault] : undefined,
    query: { enabled: Boolean(vault) },
  })

  const meta = useGoalMeta(vault)
  const amount = parseUsdc(amountInput)
  const quote = useRoundDownQuote(amount, meta.multiplier)
  const saving = quote.data
  const net = amount !== undefined && saving !== undefined ? amount - saving : undefined

  const balance = useUsdcBalance(payer)
  const allowance = useRouterAllowance(payer)
  const insufficient = amount !== undefined && balance.data !== undefined ? balance.data < amount : undefined
  const needsApproval =
    amount !== undefined && allowance.data !== undefined ? allowance.data < amount : undefined

  const approval = useTx()
  const income = useTx()

  useEffect(() => {
    if (approval.phase === 'success') void queryClient.invalidateQueries()
  }, [approval.phase, queryClient])

  useEffect(() => {
    if (income.phase === 'success') void queryClient.invalidateQueries()
  }, [income.phase, queryClient])

  const canApprove =
    Boolean(payer) && needsApproval === true && !['simulating', 'signing', 'mining'].includes(approval.phase)
  const canSend =
    Boolean(payer && vault) &&
    isVault.data === true &&
    amount !== undefined &&
    amount > 0n &&
    saving !== undefined &&
    needsApproval === false &&
    insufficient === false &&
    !['simulating', 'signing', 'mining'].includes(income.phase)

  async function onApprove() {
    if (!payer) return
    await approval.run({
      account: payer,
      address: USDC,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, maxUint256],
    })
  }

  async function onSend() {
    if (!payer || !vault || amount === undefined) return
    await income.run({
      account: payer,
      address: ROUTER,
      abi: routerAbi,
      functionName: 'receiveWithRoundDown',
      args: [amount, vault],
    })
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">Incassa</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Versa un'entrata: il destinatario incassa il netto, la differenza arrotondata finisce nel suo goal.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-300">Vault del destinatario</span>
          <input
            value={vaultInput}
            onChange={(event) => setVaultInput(event.target.value)}
            placeholder="0x…"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs outline-none focus:border-amber-500"
          />
          {vaultInput.trim() !== '' && !vaultValid && (
            <span className="mt-1 block text-xs text-red-400">Indirizzo non valido.</span>
          )}
          {isVault.data === false && (
            <span className="mt-1 block text-xs text-red-400">Non è un vault registrato nella factory.</span>
          )}
          {meta.label !== undefined && meta.owner !== undefined && (
            <span className="mt-1 block text-xs text-neutral-500">
              goal "{meta.label}" di {shortAddress(meta.owner)} · x{meta.multiplier}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-neutral-300">Importo lordo (USDC)</span>
          <input
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="104.30"
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-amber-500"
          />
        </label>

        <div className="rounded-lg bg-neutral-900 p-3 text-sm">
          {amount === undefined || saving === undefined || net === undefined ? (
            <p className="text-neutral-500">Inserisci un importo per l'anteprima.</p>
          ) : (
            <ul className="space-y-1 text-neutral-300">
              <li className="flex justify-between">
                <span>Destinatario</span>
                <span>{formatUsdc(net)} USDC</span>
              </li>
              <li className="flex justify-between">
                <span>Risparmio nel goal</span>
                <span className="text-amber-400">+{formatUsdc(saving)} USDC</span>
              </li>
              <li className="flex justify-between border-t border-neutral-800 pt-1 font-medium">
                <span>Addebito totale</span>
                <span>{formatUsdc(amount)} USDC</span>
              </li>
            </ul>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          Il tuo saldo (pagatore): {balance.data === undefined ? '…' : `${formatUsdc(balance.data)} USDC`}
        </p>

        {insufficient === true && <p className="text-xs text-red-400">Saldo USDC insufficiente.</p>}

        {needsApproval === true && (
          <button
            onClick={onApprove}
            disabled={!canApprove}
            className="w-full rounded-lg border border-amber-500 px-4 py-2 font-medium text-amber-400 disabled:opacity-40"
          >
            Approva USDC per il router
          </button>
        )}
        <TxStatus phase={approval.phase} hash={approval.hash} error={approval.error} />

        <button
          onClick={onSend}
          disabled={!canSend}
          className="w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-40"
        >
          Versa l'entrata
        </button>
        <TxStatus phase={income.phase} hash={income.hash} error={income.error} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modifica `frontend/src/App.tsx`** — aggiungi:

```tsx
import { Receive } from './pages/Receive'
```

e il branch:

```tsx
{route.name === 'receive' && <Receive />}
```

- [ ] **Step 3: Verifica build**

Run: `cd frontend && pnpm build`
Expected: build verde.

- [ ] **Step 4: Smoke manuale**

`pnpm dev` con la wallet **merchant** connessa (10 USDC dal faucet), vault = indirizzo del goal del saver, lordo `104.30` (x3 → risparmio 0.90, netto 103.40). Expected: anteprima corretta, approve al primo giro, tx `IncomeRounded` su Snowtrace; il destinatario riceve 103.40 e il goal +0.90. Con `0.50` → risparmio 0.

- [ ] **Step 5: Commit e push**

```bash
git add frontend/src
git commit -m "frontend: receive income with round-down into the recipient goal

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 6: Dettaglio goal, withdraw e storico

**Files:**
- Create: `frontend/src/hooks/useVaultEvents.ts`, `frontend/src/pages/GoalDetail.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `vaultAbi`, `DEPLOY_BLOCK`, `SNOWTRACE_TX`, `SNOWTRACE_ADDRESS`, `useGoalMeta`, `useGoalBalance`, `useAaveApy`, `useTx`, `TxStatus`, `ProgressBar`, `formatUsdc`, `parseUsdc`, `shortAddress`, `formatDate`, `usePublicClient`, `useConnection`, `useReadContract` (factory `isVault`).
- Produces:
  - `useVaultEvents(vault: Address)` → `{ data?: VaultEvent[], isLoading }` con `VaultEvent = { kind: 'Deposit' | 'Withdraw'; assets: bigint; transactionHash: Hex; blockNumber: bigint }`, a chunk di 1024 blocchi da `DEPLOY_BLOCK`, max 20 eventi più recenti (regola e).
  - `GoalDetail({ address, navigate })`.

- [ ] **Step 1: Crea `frontend/src/hooks/useVaultEvents.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import type { Address, Hex } from 'viem'
import { usePublicClient } from 'wagmi'
import { vaultAbi } from '../config/abis'
import { DEPLOY_BLOCK } from '../config/addresses'

const CHUNK = 1024n
const MAX_EVENTS = 20

export type VaultEvent = {
  kind: 'Deposit' | 'Withdraw'
  assets: bigint
  transactionHash: Hex
  blockNumber: bigint
}

export function useVaultEvents(vault: Address) {
  const client = usePublicClient()

  return useQuery({
    queryKey: ['vault-events', vault],
    enabled: Boolean(client),
    refetchInterval: 15_000,
    queryFn: async (): Promise<VaultEvent[]> => {
      if (!client) return []
      const latest = await client.getBlockNumber()
      const events: VaultEvent[] = []

      for (let from = DEPLOY_BLOCK; from <= latest; from += CHUNK) {
        const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n
        const [deposits, withdrawals] = await Promise.all([
          client.getContractEvents({ address: vault, abi: vaultAbi, eventName: 'Deposit', fromBlock: from, toBlock: to }),
          client.getContractEvents({
            address: vault,
            abi: vaultAbi,
            eventName: 'Withdraw',
            fromBlock: from,
            toBlock: to,
          }),
        ])
        for (const log of deposits) {
          const args = log.args as { assets: bigint }
          events.push({ kind: 'Deposit', assets: args.assets, transactionHash: log.transactionHash, blockNumber: log.blockNumber })
        }
        for (const log of withdrawals) {
          const args = log.args as { assets: bigint }
          events.push({ kind: 'Withdraw', assets: args.assets, transactionHash: log.transactionHash, blockNumber: log.blockNumber })
        }
      }

      return events.sort((a, b) => Number(b.blockNumber - a.blockNumber)).slice(0, MAX_EVENTS)
    },
  })
}
```

- [ ] **Step 2: Crea `frontend/src/pages/GoalDetail.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { isAddress, zeroAddress, type Address } from 'viem'
import { useConnection, useReadContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { factoryAbi, vaultAbi } from '../config/abis'
import { FACTORY, SNOWTRACE_ADDRESS, SNOWTRACE_TX } from '../config/addresses'
import { ProgressBar } from '../components/ProgressBar'
import { TxStatus } from '../components/TxStatus'
import { useAaveApy } from '../hooks/useAaveApy'
import { useGoalBalance, useGoalMeta } from '../hooks/useGoals'
import { useVaultEvents } from '../hooks/useVaultEvents'
import { formatDate, formatUsdc, parseUsdc, shortAddress } from '../lib/format'
import { useTx } from '../lib/tx'

export function GoalDetail({ address, navigate }: { address: string; navigate: (path: string) => void }) {
  const connection = useConnection()
  const queryClient = useQueryClient()
  const apy = useAaveApy()

  const valid = isAddress(address)
  const vault = valid ? (address as Address) : undefined

  const isVault = useReadContract({
    address: FACTORY,
    abi: factoryAbi,
    functionName: 'isVault',
    args: vault ? [vault] : undefined,
    query: { enabled: Boolean(vault) },
  })
  const meta = useGoalMeta(vault)
  const { balance, shares } = useGoalBalance(vault, meta.owner)
  const events = useVaultEvents(vault ?? zeroAddress)

  const connected = connection.address
  const isOwner = Boolean(meta.owner && connected && meta.owner.toLowerCase() === connected.toLowerCase())

  const [amountInput, setAmountInput] = useState('')
  const amount = parseUsdc(amountInput)
  const withdrawing = useTx()

  useEffect(() => {
    if (withdrawing.phase === 'success') {
      setAmountInput('')
      void queryClient.invalidateQueries()
    }
  }, [withdrawing.phase, queryClient])

  const earned =
    balance !== undefined && meta.netDeposited !== undefined
      ? balance > meta.netDeposited
        ? balance - meta.netDeposited
        : 0n
      : undefined
  const progress =
    balance !== undefined && meta.target !== undefined && meta.target > 0n
      ? Number((balance * 10_000n) / meta.target) / 100
      : undefined
  const overBalance = amount !== undefined && balance !== undefined ? amount > balance : undefined

  const noTxPending = !['simulating', 'signing', 'mining'].includes(withdrawing.phase)
  const canWithdraw =
    Boolean(connected && vault) && isOwner && amount !== undefined && amount > 0n && overBalance === false && noTxPending
  const canWithdrawMax =
    Boolean(connected && vault) && isOwner && shares !== undefined && shares > 0n && noTxPending

  async function onWithdrawMax() {
    if (!connected || !vault || shares === undefined || shares === 0n) return
    await withdrawing.run({
      account: connected,
      address: vault,
      abi: vaultAbi,
      functionName: 'redeem',
      args: [shares, connected, connected],
    })
  }

  async function onWithdraw() {
    if (!connected || !vault || amount === undefined) return
    await withdrawing.run({
      account: connected,
      address: vault,
      abi: vaultAbi,
      functionName: 'withdraw',
      args: [amount, connected, connected],
    })
  }

  if (!valid) {
    return (
      <div>
        <p className="text-red-400">Indirizzo vault non valido.</p>
        <button className="mt-2 text-sm underline" onClick={() => navigate('/')}>
          Torna alla dashboard
        </button>
      </div>
    )
  }

  return (
    <div>
      <button className="text-sm text-neutral-400 hover:text-white" onClick={() => navigate('/')}>
        ← Dashboard
      </button>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{meta.label ?? shortAddress(address)}</h1>
          <a
            className="text-xs text-neutral-500 underline decoration-dotted"
            href={`${SNOWTRACE_ADDRESS}${address}`}
            target="_blank"
            rel="noreferrer"
          >
            {address}
          </a>
        </div>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
          {meta.mode === 1 ? 'Yield · Aave' : 'Liquid'} · x{meta.multiplier ?? '-'}
        </span>
      </div>

      {isVault.data === false && (
        <p className="mt-2 text-xs text-red-400">Attenzione: non risulta un vault registrato nella factory.</p>
      )}

      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-neutral-500">Saldo</p>
            <p className="text-3xl font-bold">{balance === undefined ? '…' : formatUsdc(balance)} USDC</p>
          </div>
          <div className="text-right text-xs text-neutral-400">
            <p>yield {earned === undefined ? '…' : `+${formatUsdc(earned, 4)} USDC`}</p>
            <p>versato netto {meta.netDeposited === undefined ? '…' : `${formatUsdc(meta.netDeposited)} USDC`}</p>
            {meta.mode === 1 && apy !== undefined && <p>Aave APY {apy.toFixed(2)}%</p>}
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={progress} />
          <p className="mt-1 text-xs text-neutral-500">
            {meta.target !== undefined && meta.target > 0n
              ? `target ${formatUsdc(meta.target)} USDC`
              : 'nessun target impostato'}
          </p>
        </div>
      </div>

      {isOwner ? (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-semibold">Preleva</h2>
          <div className="mt-2 flex gap-2">
            <input
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-amber-500"
            />
            <button
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
              onClick={() => balance !== undefined && setAmountInput(formatUsdc(balance, 6))}
            >
              Max
            </button>
          </div>
          {overBalance === true && <p className="mt-1 text-xs text-red-400">Importo oltre il saldo del goal.</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={onWithdraw}
              disabled={!canWithdraw}
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2 font-medium text-neutral-950 disabled:opacity-40"
            >
              Preleva importo
            </button>
            <button
              onClick={onWithdrawMax}
              disabled={!canWithdrawMax}
              className="flex-1 rounded-lg border border-amber-500 px-4 py-2 font-medium text-amber-400 disabled:opacity-40"
            >
              Preleva tutto
            </button>
          </div>
          <TxStatus phase={withdrawing.phase} hash={withdrawing.hash} error={withdrawing.error} />
        </div>
      ) : (
        <p className="mt-6 text-xs text-neutral-500">Solo il proprietario ({meta.owner ? shortAddress(meta.owner) : '…'}) può prelevare.</p>
      )}

      <div className="mt-6">
        <h2 className="font-semibold">Storico</h2>
        {events.isLoading && <p className="mt-2 text-sm text-neutral-400">Lettura eventi…</p>}
        {events.data && events.data.length === 0 && (
          <p className="mt-2 text-sm text-neutral-500">Nessun movimento ancora.</p>
        )}
        <ul className="mt-2 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
          {(events.data ?? []).map((event) => (
            <li key={`${event.transactionHash}-${event.kind}-${event.blockNumber}`} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={event.kind === 'Deposit' ? 'text-emerald-400' : 'text-neutral-300'}>
                {event.kind === 'Deposit' ? 'Deposito' : 'Prelievo'} {formatUsdc(event.assets)} USDC
              </span>
              <span className="flex items-center gap-3 text-xs text-neutral-500">
                <span>blocco {event.blockNumber.toString()}</span>
                <a
                  className="underline decoration-dotted"
                  href={`${SNOWTRACE_TX}${event.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  tx
                </a>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-neutral-600">
          Ultimo aggiornamento {formatDate(events.dataUpdatedAt ? BigInt(Math.floor(events.dataUpdatedAt / 1000)) : undefined)}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Modifica `frontend/src/App.tsx`** — aggiungi:

```tsx
import { GoalDetail } from './pages/GoalDetail'
```

e sostituisci il branch `goal`:

```tsx
{route.name === 'goal' && <GoalDetail address={route.address} navigate={navigate} />}
```

- [ ] **Step 4: Verifica build**

Run: `cd frontend && pnpm build`
Expected: build verde.

- [ ] **Step 5: Smoke manuale**

`pnpm dev`, apri il goal del saver:
- saldo = `maxWithdraw` del proprietario; yield = saldo − netDeposito, mai negativo (dopo un redeem totale deve restare 0, non ~2.0: regola a);
- se mode = Yield, APY live visibile; link Snowtrace corretto;
- storico: compaiono Deposito (checkout) e Prelievo (se fatto);
- preleva 1.00 → tx verde, saldo −1.00, evento nel storico;
- "Max" riempie l'input e "Preleva tutto" redime tutte le share;
- con una wallet non proprietaria il pulsante non c'è.

- [ ] **Step 6: Commit e push**

```bash
git add frontend/src
git commit -m "frontend: goal detail with owner withdraw, live yield and chunked history

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 7: Verifica E2E, README e chiusura M1

**Files:**
- Create: `docs/e2e-m1.md`
- Modify: `README.md`, `CLAUDE.md`, `frontend/.env.example` (solo se serve documentare la variabile merchant)

**Interfaces:**
- Consumes: tutto quanto sopra.
- Produces: checklist E2E compilabile dall'utente, README aggiornato con le istruzioni frontend, stato M1 dichiarato onestamente.

- [ ] **Step 1: Crea `docs/e2e-m1.md`**

```markdown
# Formica — Checklist E2E M1 (Fuji, frontend core)

Data verifica: ______ · Wallet saver: ______ · Wallet merchant: ______

| # | Passo | Atteso | Esito | Tx |
|---|---|---|---|---|
| 1 | Connetti saver su Fuji | dashboard con i goal esistenti, APY Aave live | ☐ | — |
| 2 | Crea goal `m1-<data>` x3 Yield target 20 | naviga al dettaglio, evento GoalCreated | ☐ | |
| 3 | Spendi 4.30 verso merchant | merchant 4.30, goal +2.10, una sola tx PaymentRounded | ☐ | |
| 4 | Spendi 5.00 verso merchant | risparmio 0, merchant 5.00 | ☐ | |
| 5 | Connetti merchant (≥ 5 USDC), incassa 4.30 sul vault del saver | saver +3.40, goal +0.90, una sola tx IncomeRounded | ☐ | |
| 6 | Incassa 0.50 | risparmio 0, destinatario +0.50 | ☐ | |
| 7 | Dettaglio goal | saldo = maxWithdraw, yield ≥ 0, APY live, storico Deposit/Withdraw | ☐ | — |
| 8 | Preleva 1.00 | USDC indietro, saldo goal −1.00, evento Withdraw | ☐ | |
| 9 | Preleva tutto | saldo 0.00, yield mostrato 0 (non ~2), nessuna share residua | ☐ | — |
| 10 | Errore guidato: spendi oltre il saldo | pulsante disabilitato con motivo, nessuna tx | ☐ | — |

Note: __________________________________________
```

- [ ] **Step 2: Esegui la checklist** (manuale, utente) — serve il browser con le due wallet demo. Se un passo fallisce: annotare e aprire un fix mirato, senza allargare lo scope. Il frontend M1 è dichiarato completo solo con i passi 1-10 spuntati.

- [ ] **Step 3: Aggiorna `README.md`** — aggiungi dopo la tabella contratti:

~~~markdown
## Web app (Fuji)

```bash
cd frontend
pnpm install
cp .env.example .env.local   # opzionale: VITE_DEMO_MERCHANT=0x… per il checkout demo
pnpm dev
```

Funzioni M1 (tutte su Fuji, tx reali): dashboard dei goal, creazione goal, checkout con round-up, incasso con round-down, dettaglio con withdraw e storico. Nomi ENSv2 in arrivo (M2).
~~~

Aggiorna anche la riga **Status** sostituendo "In progress: ENSv2 goal names, web app." con una riga onesta tipo:

```markdown
- **In progress:** ENSv2 goal names (M2). Web app M1: dashboard, crea goal, checkout, incasso, withdraw su Fuji.
```

- [ ] **Step 4: Aggiorna `CLAUDE.md`** — nella sezione Commands, sostituisci `(frontend: TBD once scaffolded)` con:

```
frontend: `cd frontend && pnpm install && pnpm dev` · build: `pnpm build`
```

- [ ] **Step 5: Build finale e check del repo**

```bash
cd frontend && pnpm build
cd .. && git status --short   # nessun .env.local, nessuna chiave
git check-ignore frontend/.env.local
```

Expected: build verde; `.env.local` ignorato; niente segreti nello staging.

- [ ] **Step 6: Commit e push**

```bash
git add docs/e2e-m1.md README.md CLAUDE.md
git commit -m "docs: M1 E2E checklist, frontend instructions, honest M1 status

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

## Done criteria (M1)

- `cd frontend && pnpm build` verde.
- Flusso completo provato su Fuji con tx reali: crea goal → checkout (round-up) → incasso (round-down) → dettaglio → withdraw.
- Dashboard con saldo (`maxWithdraw`), yield (clampato ≥ 0), progresso target, modo e moltiplicatore; APY Aave letto live.
- Errori di Aave mappati a messaggio umano; pre-check di saldo/allowance con pulsanti disabilitati e motivo.
- `docs/e2e-m1.md` compilato con esito e link tx; README e CLAUDE.md aggiornati.
- Tutto pushato su `origin/main`; nessun segreto committato.
- ENS **non** dichiarato come fatto: arrivano in M2.
