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
