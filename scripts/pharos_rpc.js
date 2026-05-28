// pharos_rpc.js — Shared Pharos network config and provider factory
// Supports testnet, mainnet, and auto-detection.
//
// ⚠️  RPC AUTHENTICATION NOTE:
// The Pharos testnet RPC (testnet.dplabs-internal.com) now requires an API key
// for programmatic access. Set your RPC URL via environment variables:
//
//   PHAROS_TESTNET_RPC=https://your-api-key.pharos.zan.top/node/ext/bc/C/rpc
//   PHAROS_MAINNET_RPC=https://your-api-key.pharos-mainnet.zan.top/...
//
// Free API keys: https://zan.top  |  https://nirvana.xyz  |  https://www.alchemy.com
// Default fallback (may be rate-limited): https://testnet.dplabs-internal.com

import { ethers } from "ethers";

const TESTNET_RPC = process.env.PHAROS_TESTNET_RPC || "https://testnet.dplabs-internal.com";
const MAINNET_RPC = process.env.PHAROS_MAINNET_RPC || "https://rpc.pharos.xyz";

export const NETWORKS = {
  testnet: {
    name: "Pharos Testnet",
    rpc: TESTNET_RPC,
    chainId: 688688,
    explorer: "https://testnet.pharosscan.xyz",
    explorerApi: "https://testnet.pharosscan.xyz/api",
    nativeToken: "PHRS",
  },
  mainnet: {
    name: "Pharos Mainnet",
    rpc: MAINNET_RPC,
    chainId: 1672,
    explorer: "https://pharosscan.xyz",
    explorerApi: "https://pharosscan.xyz/api",
    nativeToken: "PROS",
  },
};

/**
 * Create an ethers.js provider for the given network key.
 * Uses staticNetwork to avoid eth_chainId preflight calls.
 * @param {"testnet"|"mainnet"} networkKey
 * @returns {ethers.JsonRpcProvider}
 */
export function getProvider(networkKey) {
  const net = NETWORKS[networkKey];
  if (!net) throw new Error(`Unknown network: "${networkKey}". Use "testnet" or "mainnet".`);
  const staticNet = ethers.Network.from({ chainId: net.chainId, name: net.name });
  return new ethers.JsonRpcProvider(net.rpc, staticNet, { staticNetwork: staticNet });
}

/**
 * Auto-detect which network a transaction hash or address belongs to.
 * Tries testnet first, then mainnet.
 * @param {string} hashOrAddress
 * @returns {Promise<{ networkKey: string, provider: ethers.JsonRpcProvider, network: object }>}
 */
export async function autoDetectNetwork(hashOrAddress) {
  for (const [key, net] of Object.entries(NETWORKS)) {
    const staticNet = ethers.Network.from({ chainId: net.chainId, name: net.name });
    const provider = new ethers.JsonRpcProvider(net.rpc, staticNet, { staticNetwork: staticNet });
    try {
      let found = false;
      if (hashOrAddress.length === 66) {
        const tx = await provider.getTransaction(hashOrAddress);
        if (tx !== null) found = true;
      } else if (ethers.isAddress(hashOrAddress)) {
        const code = await provider.getCode(hashOrAddress);
        if (code && code !== "0x") found = true;
      }
      if (found) return { networkKey: key, provider, network: net };
    } catch {
      // Network not reachable or not found — try next
    }
  }
  console.warn("⚠️  Could not auto-detect network. Defaulting to testnet.");
  const provider = getProvider("testnet");
  return { networkKey: "testnet", provider, network: NETWORKS.testnet };
}

/**
 * Parse --network CLI flag, with fallback to auto-detect.
 * @param {string[]} args - process.argv slice
 * @param {string|null} hashOrAddress - used for auto-detect if network not specified
 * @returns {Promise<{ networkKey: string, provider: ethers.JsonRpcProvider, network: object }>}
 */
export async function resolveNetwork(args, hashOrAddress = null) {
  const netIdx = args.indexOf("--network");
  if (netIdx !== -1 && args[netIdx + 1]) {
    const key = args[netIdx + 1].toLowerCase();
    const provider = getProvider(key);
    return { networkKey: key, provider, network: NETWORKS[key] };
  }
  if (hashOrAddress) return autoDetectNetwork(hashOrAddress);
  return { networkKey: "testnet", provider: getProvider("testnet"), network: NETWORKS.testnet };
}
