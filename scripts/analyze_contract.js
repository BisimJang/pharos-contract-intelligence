// analyze_contract.js — Capability 2: Understand what a smart contract does.
// Fetches ABI + source from Pharosscan (if verified), categorizes functions,
// detects ERC standards, and flags risks. Falls back to bytecode selector
// extraction for unverified contracts.

import { ethers } from "ethers";
import axios from "axios";
import { fileURLToPath } from "url";
import { resolveNetwork } from "./pharos_rpc.js";
import { detectStandards } from "./detect_standard.js";

// ─── Pharosscan API helpers ───────────────────────────────────────────────────

async function fetchContractSource(address, explorerApi) {
  try {
    const res = await axios.get(explorerApi, {
      params: { module: "contract", action: "getsourcecode", address },
      timeout: 10000,
    });
    if (res.data.status === "1" && res.data.result?.[0]) {
      return res.data.result[0];
    }
  } catch { /* API unavailable */ }
  return null;
}

async function fetchAbi(address, explorerApi) {
  try {
    const res = await axios.get(explorerApi, {
      params: { module: "contract", action: "getabi", address },
      timeout: 10000,
    });
    if (res.data.status === "1") return JSON.parse(res.data.result);
  } catch { /* not verified */ }
  return null;
}

// ─── Bytecode selector extraction (for unverified contracts) ──────────────────

/**
 * Extract all 4-byte function selectors embedded in bytecode.
 * Uses PUSH4 opcode (0x63) heuristic — not 100% precise but good enough for fingerprinting.
 */
function extractSelectorsFromBytecode(bytecode) {
  const selectors = new Set();
  if (!bytecode || bytecode === "0x") return [];
  const hex = bytecode.slice(2);
  for (let i = 0; i < hex.length - 10; i += 2) {
    if (hex[i] === "6" && hex[i + 1] === "3") {
      // PUSH4 opcode found — next 4 bytes are likely a selector
      const sel = "0x" + hex.slice(i + 2, i + 10);
      if (/^0x[0-9a-f]{8}$/.test(sel)) selectors.add(sel);
    }
  }
  return [...selectors];
}

// ─── Function categorization ──────────────────────────────────────────────────

function categorizeAbi(abi) {
  const read = [], write = [], events = [], errors = [];

  for (const item of abi) {
    if (item.type === "event") {
      events.push(item.name);
      continue;
    }
    if (item.type === "error") {
      errors.push(item.name);
      continue;
    }
    if (item.type !== "function") continue;

    const sig = `${item.name}(${(item.inputs || []).map((i) => i.type).join(",")})`;
    const entry = {
      name: item.name,
      signature: sig,
      payable: item.stateMutability === "payable",
      description: item.stateMutability,
    };

    if (item.stateMutability === "view" || item.stateMutability === "pure") {
      read.push(entry);
    } else {
      write.push(entry);
    }
  }

  return { read, write, events, errors };
}

/**
 * Generate a plain-English summary of the contract based on detected standards and functions.
 */
function generateSummary(standards, categorized, contractName, verified) {
  if (standards.length === 0) {
    return `This is a custom smart contract${contractName ? ` named "${contractName}"` : ""} with ${categorized.write.length} state-changing function(s) and ${categorized.read.length} read-only function(s). It does not appear to implement a standard ERC interface.`;
  }

  const standardDesc = {
    ERC20: "a fungible token (ERC20). It supports transfers, approvals, and balance queries.",
    ERC721: "a non-fungible token collection (ERC721 / NFT). It tracks ownership of unique tokens.",
    ERC1155: "a multi-token contract (ERC1155) that handles both fungible and non-fungible tokens in one contract.",
    ERC4626: "a tokenized vault (ERC4626) for yield-bearing assets, implementing a standardized deposit/withdraw interface.",
    Governor: "a DAO governance contract. It allows token holders to create proposals, vote, and execute on-chain decisions.",
    AccessControl: "It uses role-based access control (AccessControl) to restrict privileged functions.",
    Ownable: "It uses simple ownership (Ownable) to restrict owner-only functions.",
  };

  const primary = standards[0];
  const desc = standardDesc[primary] || `a ${primary} contract`;
  const extras = standards.slice(1).map((s) => standardDesc[s] || s).join(" ");
  return `This contract${contractName ? ` ("${contractName}")` : ""} implements ${desc}${extras ? " " + extras : ""} It has ${categorized.write.length} write function(s) and ${categorized.read.length} read function(s).${!verified ? " (Note: source code is not verified — analysis is based on bytecode selectors.)" : ""}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function analyzeContract(contractAddress, networkKey = null, preloadedAbi = null) {
  const { provider, network } = await resolveNetwork([], contractAddress);

  // ── 1. Fetch bytecode ────────────────────────────────────────────────────
  const bytecode = await provider.getCode(contractAddress);
  if (!bytecode || bytecode === "0x") {
    return {
      success: false,
      error: `No contract found at ${contractAddress} on ${network.name}. This address is either an EOA (regular wallet) or does not exist on this network.`,
    };
  }

  // ── 2. Try to fetch ABI + source from Pharosscan ─────────────────────────
  let abi = preloadedAbi;
  let sourceInfo = null;
  let verified = false;

  if (!abi) {
    abi = await fetchAbi(contractAddress, network.explorerApi);
    if (abi) verified = true;
  } else {
    verified = true; // user-supplied ABI
  }

  if (verified) {
    sourceInfo = await fetchContractSource(contractAddress, network.explorerApi);
  }

  // ── 3. Get function signatures ───────────────────────────────────────────
  let functionSigs = [];
  let rawSelectors = [];
  let categorized = { read: [], write: [], events: [], errors: [] };

  if (abi) {
    categorized = categorizeAbi(abi);
    functionSigs = [
      ...categorized.read.map((f) => f.signature),
      ...categorized.write.map((f) => f.signature),
    ];
  } else {
    rawSelectors = extractSelectorsFromBytecode(bytecode);
  }

  // ── 4. Detect standards + risks ──────────────────────────────────────────
  const { standards, risks } = detectStandards(functionSigs, rawSelectors);

  // ── 5. Extract metadata ──────────────────────────────────────────────────
  const contractName = sourceInfo?.ContractName || null;
  const compilerVersion = sourceInfo?.CompilerVersion || null;
  const licenseType = sourceInfo?.LicenseType || null;

  // ── 6. Generate summary ──────────────────────────────────────────────────
  const summary = generateSummary(standards, categorized, contractName, verified);

  return {
    success: true,
    contractAddress,
    network: network.name,
    verified,
    contractName,
    compilerVersion,
    licenseType,
    standards: standards.length > 0 ? standards : ["Custom / Unknown"],
    summary,
    functions: {
      read: categorized.read.map((f) => ({
        name: f.name,
        signature: f.signature,
        payable: f.payable,
      })),
      write: categorized.write.map((f) => ({
        name: f.name,
        signature: f.signature,
        payable: f.payable,
      })),
    },
    events: categorized.events,
    customErrors: categorized.errors,
    risks: risks.length > 0 ? risks : ["✅ No known risk patterns detected."],
    rawSelectorCount: rawSelectors.length,
    explorerUrl: `${network.explorer}/address/${contractAddress}`,
    sourceUrl: verified ? `${network.explorer}/address/${contractAddress}#code` : null,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

  const contract = get("--contract");
  const network  = get("--network");
  const abiPath  = get("--abi");

  if (!contract) {
    console.error("Usage: node scripts/analyze_contract.js --contract <ADDRESS> [--network testnet|mainnet] [--abi path/to/abi.json]");
    process.exit(1);
  }

  let abi = null;
  if (abiPath) {
    try {
      const { readFileSync } = await import("fs");
      abi = JSON.parse(readFileSync(abiPath, "utf8"));
    } catch { /* ignore */ }
  }

  analyzeContract(contract, network, abi)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => console.error(JSON.stringify({ error: e.message }, null, 2)));
}
