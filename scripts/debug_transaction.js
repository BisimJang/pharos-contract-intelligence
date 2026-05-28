// debug_transaction.js — Capability 1: Debug a failing transaction on Pharos.
// Fetches the tx, replays the call to capture the revert, and decodes the reason.

import { ethers } from "ethers";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { decodeRevert } from "./decode_revert.js";
import { resolveNetwork } from "./pharos_rpc.js";
import axios from "axios";

/**
 * Fetch the verified ABI for a contract from Pharosscan.
 * Returns null if the contract is not verified.
 */
async function fetchAbiFromPharosscan(contractAddress, explorerApi) {
  try {
    const res = await axios.get(explorerApi, {
      params: {
        module: "contract",
        action: "getabi",
        address: contractAddress,
      },
      timeout: 10000,
    });
    if (res.data.status === "1" && res.data.result) {
      return JSON.parse(res.data.result);
    }
  } catch {
    // Pharosscan unavailable or contract not verified
  }
  return null;
}

/**
 * Core debug function.
 * @param {string} txHash - transaction hash to debug
 * @param {string} networkKey - "testnet" | "mainnet"
 * @param {string|null} contractAddress - optional, used to fetch ABI
 * @param {object[]|null} abi - optional pre-supplied ABI
 * @returns {Promise<object>} structured debug report
 */
export async function debugTransaction(txHash, networkKey, contractAddress = null, abi = null) {
  const { provider, network } = await resolveNetwork([], txHash);
  const resolvedKey = networkKey || "auto";

  // ── 1. Fetch tx + receipt ─────────────────────────────────────────────────
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  if (!tx) {
    return {
      success: false,
      error: `Transaction ${txHash} not found on ${network.name}. It may be pending, on a different network, or the hash is incorrect.`,
    };
  }

  if (!receipt) {
    return {
      success: false,
      error: `Transaction ${txHash} has no receipt yet — it may still be pending.`,
    };
  }

  if (receipt.status === 1) {
    return {
      success: true,
      txHash,
      network: network.name,
      status: "✅ Success",
      message: "This transaction succeeded! No revert to debug.",
      explorerUrl: `${network.explorer}/tx/${txHash}`,
    };
  }

  // ── 2. Try to fetch ABI from Pharosscan ───────────────────────────────────
  const resolvedContract = contractAddress || tx.to;
  if (!abi && resolvedContract) {
    abi = await fetchAbiFromPharosscan(resolvedContract, network.explorerApi);
  }

  // ── 3. Replay the call to get revert data ─────────────────────────────────
  let revertData = "0x";
  try {
    await provider.call({
      to: tx.to,
      from: tx.from,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit,
    }, receipt.blockNumber - 1);
  } catch (err) {
    // ethers.js wraps the revert in the error — extract the raw data
    if (err.data) {
      revertData = err.data;
    } else if (err.error?.data) {
      revertData = err.error.data;
    } else if (typeof err.message === "string") {
      // Try to extract hex from message
      const match = err.message.match(/0x[0-9a-fA-F]+/);
      if (match) revertData = match[0];
    }
  }

  // ── 4. Check for out-of-gas ───────────────────────────────────────────────
  const gasUsed = receipt.gasUsed;
  const gasLimit = tx.gasLimit;
  const isOutOfGas = gasUsed >= gasLimit;

  if (isOutOfGas && revertData === "0x") {
    return {
      success: false,
      txHash,
      network: network.name,
      status: "❌ Failed — Out of Gas",
      revertType: "outOfGas",
      message: "The transaction ran out of gas.",
      details: {
        gasUsed: gasUsed.toString(),
        gasLimit: gasLimit.toString(),
      },
      fix: `Increase the gas limit. The transaction used all ${gasUsed.toLocaleString()} units of gas (limit: ${gasLimit.toLocaleString()}). Try setting the gas limit to at least ${(BigInt(gasLimit) * 130n / 100n).toString()} (current limit × 1.3).`,
      explorerUrl: `${network.explorer}/tx/${txHash}`,
    };
  }

  // ── 5. Decode the revert ──────────────────────────────────────────────────
  const decoded = decodeRevert(revertData, abi);

  return {
    success: false,
    txHash,
    network: network.name,
    status: "❌ Failed",
    contract: resolvedContract,
    abiSource: abi ? "Pharosscan (verified)" : "not available — custom errors may not be fully decoded",
    gasUsed: gasUsed.toString(),
    gasLimit: gasLimit.toString(),
    ...decoded,
    explorerUrl: `${network.explorer}/tx/${txHash}`,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  const txHash   = get("--tx");
  const network  = get("--network");
  const contract = get("--contract");
  const abiPath  = get("--abi");

  if (!txHash) {
    console.error("Usage: node scripts/debug_transaction.js --tx <TX_HASH> [--network testnet|mainnet] [--contract <ADDRESS>] [--abi path/to/abi.json]");
    process.exit(1);
  }

  let abi = null;
  if (abiPath) {
    try { abi = JSON.parse(readFileSync(abiPath, "utf8")); } catch { /* ignore */ }
  }

  debugTransaction(txHash, network, contract, abi)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((err)   => console.error(JSON.stringify({ error: err.message }, null, 2)));
}
