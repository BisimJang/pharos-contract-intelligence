// pharos_rpc.js — Shared Pharos network config and provider factory
// Supports testnet, mainnet, and auto-detection.

import { ethers } from "ethers";

export const NETWORKS = {
  testnet: {
    name: "Pharos Testnet",
    rpc: "https://testnet.dplabs-internal.com",
    chainId: 688688,
    explorer: "https://pharosscan.xyz",
    explorerApi: "https://pharosscan.xyz/api",
    nativeToken: "PTT",
  },
  mainnet: {
    name: "Pharos Mainnet",
    rpc: "https://pharos-rpc.publicnode.com",
    chainId: 688688,
    explorer: "https://pharosscan.xyz",
    explorerApi: "https://pharosscan.xyz/api",
    nativeToken: "PHR",
  },
};

/**
 * Create an ethers.js provider for the given network key.
 * @param {"testnet"|"mainnet"} networkKey
 * @returns {ethers.JsonRpcProvider}
 */
export function getProvider(networkKey) {
  const net = NETWORKS[networkKey];
  if (!net) throw new Error(`Unknown network: "${networkKey}". Use "testnet" or "mainnet".`);
  return new ethers.JsonRpcProvider(net.rpc);
}

/**
 * Auto-detect which network a transaction hash or address belongs to.
 * Tries testnet first, then mainnet. Returns the network key and provider.
 * @param {string} hashOrAddress
 * @returns {Promise<{ networkKey: string, provider: ethers.JsonRpcProvider, network: object }>}
 */
export async function autoDetectNetwork(hashOrAddress) {
  for (const [key, net] of Object.entries(NETWORKS)) {
    const provider = new ethers.JsonRpcProvider(net.rpc);
    try {
      let found = false;
      if (hashOrAddress.length === 66) {
        // Looks like a tx hash
        const tx = await provider.getTransaction(hashOrAddress);
        if (tx !== null) found = true;
      } else if (ethers.isAddress(hashOrAddress)) {
        // Contract address — check if it has code
        const code = await provider.getCode(hashOrAddress);
        if (code && code !== "0x") found = true;
      }
      if (found) return { networkKey: key, provider, network: net };
    } catch {
      // Network not reachable or tx not found — try next
    }
  }
  // Default to testnet if nothing found
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
  // No hints — default testnet
  return { networkKey: "testnet", provider: getProvider("testnet"), network: NETWORKS.testnet };
}
