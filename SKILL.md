---
name: pharos-contract-intelligence
description: >
  Use this skill for any smart contract task on the Pharos blockchain.
  Activate when the user wants to: (1) debug or understand why a transaction
  failed ("why did my tx fail", "debug transaction 0x...", "revert reason",
  "transaction reverted"); (2) understand or analyze what a smart contract
  does ("what does this contract do", "explain contract 0x...", "analyze
  contract", "what functions does this contract have", "is this contract
  safe"); (3) verify contract source code on Pharosscan ("verify my contract",
  "submit source for verification", "verify 0x... on Pharosscan"). Works on
  both Pharos testnet and mainnet — auto-detects the network from context.
version: 1.0.0
tags:
  - debugging
  - transactions
  - smart-contracts
  - verification
  - analysis
  - pharos
  - blockchain
  - revert
author: pharos-contract-intelligence
---

# Pharos Contract Intelligence Skill

You are equipped with a powerful 3-in-1 smart contract intelligence skill for the Pharos blockchain. Use the guidance below to handle each scenario.

---

## Capability 1 — Debug a Failing Transaction

### When to Use
- User provides a transaction hash and asks why it failed, reverted, or errored
- User says: "debug tx", "revert reason", "why did this fail", "transaction failed"

### Steps
1. **Identify the network** from context (testnet vs mainnet). If unclear, ask. Default: auto-detect by trying testnet first.
2. **Run the debug script**:
   ```bash
   node scripts/debug_transaction.js --tx <TX_HASH> --network <testnet|mainnet>
   ```
   If the user also provides an ABI or contract address, pass them:
   ```bash
   node scripts/debug_transaction.js --tx <TX_HASH> --contract <ADDRESS> --network <testnet|mainnet>
   ```
3. **Interpret the JSON output** and explain it in plain English:
   - If `revertType: "require"` → show the require message and explain what condition failed
   - If `revertType: "customError"` → show the error name, decoded params, and what it means
   - If `revertType: "panic"` → look up the panic code in `references/panic_codes.md` and explain
   - If `revertType: "outOfGas"` → explain gas exhaustion and suggest gas limit increase
   - If `revertType: "empty"` → explain it's likely an assertion or low-level revert
4. **Always suggest a fix** — what the developer should check or change
5. **If source is available** (fetched from Pharosscan), mention the relevant line or function

### Output Format
```
🐛 Transaction Debug Report
━━━━━━━━━━━━━━━━━━━━━━━━━━
TX Hash:     0x...
Network:     Pharos Testnet / Mainnet
Status:      ❌ Failed

Revert Type: [Custom Error / Require / Panic / Out of Gas]
Error:       [Error name or message]
Details:     [Decoded parameters if applicable]

What happened:
[Plain-English explanation of exactly why the tx reverted]

Suggested Fix:
[Clear actionable recommendation for the developer]

Pharosscan: https://pharosscan.xyz/tx/0x...
```

---

## Capability 2 — Understand / Analyze a Smart Contract

### When to Use
- User provides a contract address and wants to know what it does
- User asks about contract functions, ownership, risks, or token standards
- User says: "what does this contract do", "explain this contract", "analyze 0x...", "is this contract safe"

### Steps
1. **Run the analyze script**:
   ```bash
   node scripts/analyze_contract.js --contract <ADDRESS> --network <testnet|mainnet>
   ```
   If the user provides ABI or source code directly, pass it via `--abi <path>` or `--source <path>`
2. **The script returns a JSON object** with:
   - `standard`: detected ERC standard(s) (ERC20, ERC721, ERC1155, Governor, etc.)
   - `functions`: categorized list (read vs write, payable, access-controlled)
   - `risks`: array of flagged patterns (unbounded mint, owner-only, upgradeable, etc.)
   - `verified`: whether source is verified on Pharosscan
   - `summary`: auto-generated one-liner
3. **Present a clear, structured summary** in plain English
4. **Highlight any risk flags** prominently with ⚠️

### Output Format
```
🔍 Smart Contract Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━
Contract:    0x...
Network:     Pharos Testnet / Mainnet
Verified:    ✅ Yes / ❌ No (unverified — analysis from bytecode selectors)
Standard:    ERC20 / ERC721 / Custom / etc.

📋 What this contract does:
[2-3 sentence plain-English description]

📂 Key Functions:
  Read:  balanceOf, totalSupply, allowance, name, symbol, decimals
  Write: transfer, approve, transferFrom, mint (owner only)

⚠️  Risk Flags:
  - [Flag 1: e.g. "Owner can mint unlimited tokens — no supply cap enforced"]
  - [Flag 2: e.g. "Contract uses delegatecall — may be an upgradeable proxy"]

Pharosscan: https://pharosscan.xyz/address/0x...
```

---

## Capability 3 — Verify Contract Source Code

### When to Use
- User wants to verify their deployed contract on Pharosscan
- User says: "verify my contract", "submit source code", "verify on Pharosscan"

### Information Required
Ask the user for the following if not provided:
- **Contract address** (deployed on Pharos)
- **Solidity source file(s)**
- **Compiler version** (e.g. `v0.8.20+commit.a1b79de6`)
- **Contract name** (the main contract name in the file)
- **Optimization**: enabled? How many runs? (default: yes, 200 runs)
- **License type** (MIT, GPL, unlicensed, etc.)

### Steps
1. **Run the verify script**:
   ```bash
   node scripts/verify_contract.js \
     --contract <ADDRESS> \
     --source <path/to/MyContract.sol> \
     --name <ContractName> \
     --compiler <vX.X.X+commitXXXXXXXX> \
     --network <testnet|mainnet> \
     --optimization <true|false> \
     --runs <200>
   ```
2. **The script submits** to the Pharosscan API and polls for result
3. **If successful**: return the verified Pharosscan link
4. **If failed**: parse the error and explain clearly (e.g., compiler mismatch, wrong contract name, flattening needed for imports)

### Output Format
```
✅ Contract Verification Result
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contract:    0x...
Network:     Pharos Testnet / Mainnet
Status:      ✅ Verified Successfully / ❌ Verification Failed

[On success]:
View on Pharosscan: https://pharosscan.xyz/address/0x...#code

[On failure]:
Reason: [Clear explanation of what went wrong]
Fix:    [Actionable steps to resolve]
```

---

## General Notes

- **Network auto-detection**: Check if the user mentions "testnet", "mainnet", or a specific RPC. If unclear, try testnet first (chain ID 688688). If the tx/address isn't found, try mainnet.
- **Error handling**: If a script returns an error, explain it clearly in plain English — never show raw stack traces to the user.
- **Dependencies**: Ensure `node_modules` are installed before running scripts:
  ```bash
  cd pharos-contract-intelligence && npm install
  ```
- **Ethers.js v6** is used for all RPC interactions. All scripts are ES modules (`type: "module"` in package.json).
