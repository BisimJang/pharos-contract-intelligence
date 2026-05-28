// verify_contract.js — Capability 3: Submit contract source for verification on Pharosscan.
// Submits source code, polls for the result, and returns a structured report.

import axios from "axios";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolveNetwork } from "./pharos_rpc.js";

// Pharosscan license type codes
const LICENSE_TYPES = {
  "none":       "1",
  "unlicensed": "2",
  "mit":        "3",
  "gpl-2.0":   "4",
  "gpl-3.0":   "5",
  "lgpl-2.1":  "6",
  "lgpl-3.0":  "7",
  "bsd-2":     "8",
  "bsd-3":     "9",
  "mpl-2.0":   "10",
  "osl-3.0":   "11",
  "apache-2.0":"12",
  "agpl-3.0":  "13",
  "busl-1.1":  "14",
};

/**
 * Poll Pharosscan for verification status using a GUID.
 * @returns {Promise<{status: string, message: string}>}
 */
async function pollVerificationStatus(guid, explorerApi, maxAttempts = 20, intervalMs = 3000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const res = await axios.get(explorerApi, {
        params: { module: "contract", action: "checkverifystatus", guid },
        timeout: 10000,
      });
      const result = res.data.result || "";

      if (result === "Pass - Verified") return { status: "verified", message: "Verification successful!" };
      if (result.startsWith("Fail")) return { status: "failed", message: result };
      if (result === "Already Verified") return { status: "already_verified", message: "Contract is already verified on Pharosscan." };
      // Still pending — loop
    } catch {
      // Retry
    }
  }
  return { status: "timeout", message: "Verification is taking longer than expected. Check Pharosscan manually." };
}

/**
 * Submit contract source code for verification on Pharosscan.
 * @param {object} params
 * @param {string} params.contractAddress
 * @param {string} params.sourceCode - full Solidity source (flattened if imports used)
 * @param {string} params.contractName - e.g. "MyToken"
 * @param {string} params.compilerVersion - e.g. "v0.8.20+commit.a1b79de6"
 * @param {string} params.networkKey - "testnet" | "mainnet"
 * @param {boolean} params.optimizationUsed - default true
 * @param {number} params.runs - optimizer runs, default 200
 * @param {string} params.license - "mit", "gpl-3.0", etc. default "mit"
 * @param {string} params.constructorArgs - ABI-encoded constructor args hex, default ""
 */
export async function verifyContract({
  contractAddress,
  sourceCode,
  contractName,
  compilerVersion,
  networkKey = null,
  optimizationUsed = true,
  runs = 200,
  license = "mit",
  constructorArgs = "",
}) {
  const { network } = await resolveNetwork([], contractAddress);
  const explorerApi = network.explorerApi;

  const licenseCode = LICENSE_TYPES[license.toLowerCase()] || "3"; // default MIT

  // ── 1. Submit verification request ─────────────────────────────────────────
  let guid;
  try {
    const res = await axios.post(
      explorerApi,
      new URLSearchParams({
        module: "contract",
        action: "verifysourcecode",
        contractaddress: contractAddress,
        sourceCode,
        codeformat: "solidity-single-file",
        contractname: contractName,
        compilerversion: compilerVersion,
        optimizationUsed: optimizationUsed ? "1" : "0",
        runs: runs.toString(),
        constructorArguements: constructorArgs,
        licenseType: licenseCode,
        evmversion: "default",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      }
    );

    if (res.data.status !== "1") {
      const errMsg = res.data.result || res.data.message || "Unknown submission error";
      return {
        success: false,
        contractAddress,
        network: network.name,
        status: "❌ Submission Failed",
        error: errMsg,
        fix: parseVerificationError(errMsg),
        explorerUrl: `${network.explorer}/address/${contractAddress}`,
      };
    }

    guid = res.data.result;
  } catch (err) {
    return {
      success: false,
      contractAddress,
      network: network.name,
      status: "❌ API Error",
      error: err.message,
      fix: "Could not reach Pharosscan API. Check your network connection and try again.",
      explorerUrl: `${network.explorer}/address/${contractAddress}`,
    };
  }

  // ── 2. Poll for result ──────────────────────────────────────────────────────
  const pollResult = await pollVerificationStatus(guid, explorerApi);

  if (pollResult.status === "verified" || pollResult.status === "already_verified") {
    return {
      success: true,
      contractAddress,
      network: network.name,
      status: "✅ Verified",
      message: pollResult.message,
      contractName,
      compilerVersion,
      explorerUrl: `${network.explorer}/address/${contractAddress}`,
      sourceUrl: `${network.explorer}/address/${contractAddress}#code`,
    };
  }

  return {
    success: false,
    contractAddress,
    network: network.name,
    status: "❌ Verification Failed",
    error: pollResult.message,
    fix: parseVerificationError(pollResult.message),
    explorerUrl: `${network.explorer}/address/${contractAddress}`,
  };
}

/**
 * Map common Pharosscan error messages to actionable fix suggestions.
 */
function parseVerificationError(message) {
  if (!message) return "Check the submission parameters and try again.";
  const m = message.toLowerCase();

  if (m.includes("bytecode does not match")) {
    return "The compiled bytecode doesn't match the deployed bytecode. Check: (1) correct compiler version, (2) exact optimization settings (runs count), (3) constructor arguments, (4) all imports are flattened into the source file.";
  }
  if (m.includes("compiler version")) {
    return "Wrong compiler version. Use the exact version (e.g. v0.8.20+commit.a1b79de6). Check the version used in your Hardhat/Foundry config.";
  }
  if (m.includes("contract name")) {
    return "Incorrect contract name. Use the exact name of the main contract as declared in Solidity (case-sensitive).";
  }
  if (m.includes("source code")) {
    return "Source code issue. If your contract uses imports, flatten it first: run `forge flatten src/MyContract.sol > flattened.sol` or use the `hardhat-flatten` plugin.";
  }
  if (m.includes("already verified")) {
    return "This contract is already verified. No action needed.";
  }
  return "Verification failed. Common causes: wrong compiler version, incorrect optimization settings, unflattened imports, or mismatched constructor arguments. Double-check each parameter.";
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

  const contract  = get("--contract");
  const source    = get("--source");
  const name      = get("--name");
  const compiler  = get("--compiler");
  const network   = get("--network");
  const optRaw    = get("--optimization");
  const runsRaw   = get("--runs");
  const license   = get("--license") || "mit";
  const ctorArgs  = get("--constructor-args") || "";

  if (!contract || !source || !name || !compiler) {
    console.error(`Usage: node scripts/verify_contract.js \\
  --contract <ADDRESS> \\
  --source <path/to/Contract.sol> \\
  --name <ContractName> \\
  --compiler <vX.X.X+commitXXXXXXXX> \\
  [--network testnet|mainnet] \\
  [--optimization true|false] \\
  [--runs 200] \\
  [--license mit] \\
  [--constructor-args <hex>]`);
    process.exit(1);
  }

  let sourceCode;
  try {
    sourceCode = readFileSync(source, "utf8");
  } catch {
    console.error(`Could not read source file: ${source}`);
    process.exit(1);
  }

  verifyContract({
    contractAddress: contract,
    sourceCode,
    contractName: name,
    compilerVersion: compiler,
    networkKey: network,
    optimizationUsed: optRaw !== "false",
    runs: runsRaw ? parseInt(runsRaw) : 200,
    license,
    constructorArgs: ctorArgs,
  })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => console.error(JSON.stringify({ error: e.message }, null, 2)));
}
