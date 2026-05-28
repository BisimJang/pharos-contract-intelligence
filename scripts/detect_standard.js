// detect_standard.js — Identifies ERC standard and flags contract risks.
// Uses function selector fingerprinting against known ERC interfaces.

import { ethers } from "ethers";

// ─── ERC fingerprints: minimum required selectors for detection ───────────────
const ERC_FINGERPRINTS = {
  ERC20: {
    required: ["transfer(address,uint256)", "approve(address,uint256)", "balanceOf(address)", "totalSupply()"],
    optional: ["transferFrom(address,address,uint256)", "allowance(address,address)", "name()", "symbol()", "decimals()"],
  },
  ERC721: {
    required: ["ownerOf(uint256)", "safeTransferFrom(address,address,uint256)", "approve(address,uint256)", "balanceOf(address)"],
    optional: ["tokenURI(uint256)", "setApprovalForAll(address,bool)", "isApprovedForAll(address,address)", "transferFrom(address,address,uint256)"],
  },
  ERC1155: {
    required: ["balanceOf(address,uint256)", "balanceOfBatch(address[],uint256[])", "safeTransferFrom(address,address,uint256,uint256,bytes)", "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)"],
    optional: ["uri(uint256)", "setApprovalForAll(address,bool)", "isApprovedForAll(address,address)"],
  },
  ERC4626: {
    required: ["deposit(uint256,address)", "withdraw(uint256,address,address)", "totalAssets()", "convertToShares(uint256)"],
    optional: ["mint(uint256,address)", "redeem(uint256,address,address)", "asset()", "maxDeposit(address)"],
  },
  Governor: {
    required: ["propose(address[],uint256[],bytes[],string)", "castVote(uint256,uint8)", "execute(address[],uint256[],bytes[],bytes32)"],
    optional: ["queue(address[],uint256[],bytes[],bytes32)", "state(uint256)", "votingDelay()", "votingPeriod()"],
  },
  AccessControl: {
    required: ["hasRole(bytes32,address)", "grantRole(bytes32,address)", "revokeRole(bytes32,address)"],
    optional: ["getRoleAdmin(bytes32)", "renounceRole(bytes32,address)"],
  },
  Ownable: {
    required: ["owner()", "transferOwnership(address)"],
    optional: ["renounceOwnership()"],
  },
};

// ─── Risk pattern selectors ───────────────────────────────────────────────────
const RISK_PATTERNS = [
  {
    selector: ethers.id("mint(address,uint256)").slice(0, 10),
    flag: "⚠️  Owner/minter can mint tokens — verify there is a supply cap.",
  },
  {
    selector: ethers.id("selfdestruct(address)").slice(0, 10),
    flag: "🚨 Contract contains a selfdestruct function — it can be permanently destroyed.",
  },
  {
    selector: ethers.id("upgradeTo(address)").slice(0, 10),
    flag: "⚠️  Contract is upgradeable (upgradeTo) — logic can be changed after deployment.",
  },
  {
    selector: ethers.id("upgradeToAndCall(address,bytes)").slice(0, 10),
    flag: "⚠️  Contract is upgradeable (upgradeToAndCall) — logic can be changed after deployment.",
  },
  {
    selector: ethers.id("pause()").slice(0, 10),
    flag: "ℹ️  Contract is pausable — transfers/actions can be halted by owner.",
  },
  {
    selector: ethers.id("setFee(uint256)").slice(0, 10),
    flag: "⚠️  Owner can change fees dynamically via setFee().",
  },
  {
    selector: ethers.id("blacklist(address)").slice(0, 10),
    flag: "⚠️  Contract has address blacklisting — owner can block specific wallets.",
  },
  {
    selector: ethers.id("setTaxFee(uint256)").slice(0, 10),
    flag: "⚠️  Owner can change tax fees — may indicate a honeypot or rug risk.",
  },
  {
    selector: ethers.id("withdrawAll()").slice(0, 10),
    flag: "🚨 Contract has withdrawAll() — owner may be able to drain contract funds.",
  },
];

/**
 * Given a list of function signatures from the ABI, detect ERC standards and risk flags.
 * @param {string[]} functionSigs - array of human-readable signatures, e.g. ["transfer(address,uint256)"]
 * @param {string[]} rawSelectors - array of 4-byte hex selectors from bytecode (optional)
 * @returns {{ standards: string[], risks: string[], confidence: string }}
 */
export function detectStandards(functionSigs, rawSelectors = []) {
  const detected = [];
  const allSelectors = new Set([
    ...functionSigs.map((sig) => ethers.id(sig).slice(0, 10)),
    ...rawSelectors.map((s) => s.toLowerCase()),
  ]);

  for (const [name, { required, optional }] of Object.entries(ERC_FINGERPRINTS)) {
    const requiredSelectors = required.map((sig) => ethers.id(sig).slice(0, 10));
    const matchCount = requiredSelectors.filter((s) => allSelectors.has(s)).length;

    if (matchCount === requiredSelectors.length) {
      const optionalSelectors = optional.map((sig) => ethers.id(sig).slice(0, 10));
      const optionalCount = optionalSelectors.filter((s) => allSelectors.has(s)).length;
      detected.push({ name, matchScore: matchCount + optionalCount * 0.5 });
    }
  }

  // Sort by confidence score descending
  detected.sort((a, b) => b.matchScore - a.matchScore);

  // ── Risk flags ──────────────────────────────────────────────────────────────
  const risks = RISK_PATTERNS
    .filter((p) => allSelectors.has(p.selector))
    .map((p) => p.flag);

  return {
    standards: detected.map((d) => d.name),
    risks,
    confidence: detected.length > 0 ? "high" : "low",
  };
}
