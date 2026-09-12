import { parseAbi, type Address } from 'viem'

// contracts/deployments/sepolia-ens.json (setup 2026-09-12) — aggiorna qui se
// la beta ENSv2 viene azzerata e si rifà il setup.
export const SEPOLIA_CHAIN_ID = 11155111
export const ETH_REGISTRY: Address = '0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2'
export const UNIVERSAL_RESOLVER: Address = '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe'
export const FORMICA_REGISTRY: Address = '0x9dE5F9cd978caB5fb07717e6014131E9E1f0D651'
export const FORMICA_REGISTRAR: Address = '0xe31c0b4AF6F1c8F8b7279e6AfdD6bD178799E5f3'
export const FORMICA_ROOT = 'formica.eth'

/** ENSIP-11: 0x80000000 | 43113 (Avalanche Fuji). */
export const FUJI_COIN_TYPE = 2147526761n

/** ROLE_SET_SUBREGISTRY | ROLE_SET_RESOLVER | ROLE_RENEW, più i rispettivi admin. */
export const USER_NAME_ROLES =
  (1n << 20n) | (1n << 24n) | (1n << 16n) | (1n << 148n) | (1n << 152n) | (1n << 144n)

export const ensRegistrarAbi = parseAbi([
  'function claim(string label) returns (address registry, address resolver)',
  'function labelOf(address owner) view returns (string)',
  'event Claimed(string label, address indexed owner, address registry, address resolver)',
])

export const ensRegistryAbi = parseAbi([
  'function register(string label, address owner, address subregistry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)',
  'function getSubregistry(string label) view returns (address)',
  'function getResolver(string label) view returns (address)',
])

export const ensResolverAbi = parseAbi([
  'function setAddr(bytes32 node, uint256 coinType, bytes value)',
  'function addr(bytes32 node, uint256 coinType) view returns (bytes)',
  'function setText(bytes32 node, string key, string value)',
  'function text(bytes32 node, string key) view returns (string)',
])

export const ENS_EXPLORER = 'https://explorer.ens.dev/name/'
