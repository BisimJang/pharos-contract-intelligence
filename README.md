# pharos-contract-intelligence

> **A Pharos Agent Center skill that gives AI agents complete smart contract intelligence on the Pharos blockchain.**

Powered by the [Pharos Skill Engine](https://www.pharos.xyz/agent-center), this skill enables any compatible AI agent (Claude Code, OpenClaw, Codex) to:

1. 🐛 **Debug failing transactions** — decode revert reasons in plain English
2. 🔍 **Understand smart contracts** — analyze any contract's purpose, functions, and risks
3. ✅ **Verify contract source code** — submit and confirm verification on Pharosscan

All via natural language — no manual RPC calls or ABI decoding required.

---

## Installation

### Option A — Install via npx (recommended)
```bash
# Claude Code
npx skills add https://github.com/YOUR_USERNAME/pharos-contract-intelligence ~/.claude/skills/

# OpenClaw
npx skills add https://github.com/YOUR_USERNAME/pharos-contract-intelligence ~/.openclaw/skills/

# Codex
npx skills add https://github.com/YOUR_USERNAME/pharos-contract-intelligence ~/.codex/skills/
```

### Option B — Manual install
```bash
git clone https://github.com/YOUR_USERNAME/pharos-contract-intelligence
cp -r pharos-contract-intelligence ~/.claude/skills/
```

### Install dependencies
```bash
cd ~/.claude/skills/pharos-contract-intelligence
npm install
```

---

## Usage Examples

### 🐛 Capability 1 — Debug a Failing Transaction

**Natural language:**
```
Why did transaction 0xabc123... fail on Pharos testnet?
```
```
Debug this failing tx: 0xdef456...
```
```
What caused the revert on 0x789abc...?
```

**The agent will:**
- Fetch the transaction and its receipt
- Replay the call to capture the raw revert bytes
- Decode: `require()` messages, custom errors, Solidity panic codes, or out-of-gas
- Fetch the verified ABI from Pharosscan automatically (if available)
- Return a clear explanation + suggested fix

---

### 🔍 Capability 2 — Understand a Smart Contract

**Natural language:**
```
What does the contract at 0x1234... do on Pharos mainnet?
```
```
Analyze this contract: 0xabcd... — is it safe?
```
```
What functions does 0xef01... have?
```

**The agent will:**
- Fetch the ABI and source code from Pharosscan (if verified)
- Fall back to bytecode selector extraction for unverified contracts
- Detect ERC standards (ERC20, ERC721, ERC1155, Governor, etc.)
- Flag risk patterns (unbounded mint, upgradeable proxy, blacklist functions, etc.)
- Generate a plain-English summary of what the contract does

---

### ✅ Capability 3 — Verify Contract Source Code

**Natural language:**
```
Verify my contract at 0x5678... on Pharos testnet. Here's the source code: [paste source]
```
```
Submit my ERC20 contract for verification on Pharosscan. Compiler: v0.8.20, optimization: on, 200 runs.
```

**The agent will ask for (if not provided):**
- Contract address
- Solidity source code (flattened if using imports)
- Compiler version (exact, e.g. `v0.8.20+commit.a1b79de6`)
- Contract name
- Optimization settings

**Then it will:**
- Submit to the Pharosscan verification API
- Poll until verification completes
- Return the verified Pharosscan link or a clear explanation of why it failed

---

## Network Support

| Network | RPC | Chain ID | Explorer |
|---------|-----|----------|----------|
| Pharos Testnet | `https://testnet.dplabs-internal.com` | 688688 | [pharosscan.xyz](https://pharosscan.xyz) |
| Pharos Mainnet | `https://pharos-rpc.publicnode.com` | 688688 | [pharosscan.xyz](https://pharosscan.xyz) |

**Auto-detection**: The skill automatically detects the correct network by checking whether the transaction/address exists on testnet first, then mainnet. You can also specify explicitly: *"on Pharos testnet"* or *"on Pharos mainnet"*.

---

## File Structure

```
pharos-contract-intelligence/
├── SKILL.md                          ← Agent instructions (main skill file)
├── README.md                         ← This file
├── package.json
├── scripts/
│   ├── pharos_rpc.js                 ← Shared network config & provider
│   ├── decode_revert.js              ← Revert byte decoder (all patterns)
│   ├── debug_transaction.js          ← Capability 1: Transaction debugger
│   ├── analyze_contract.js           ← Capability 2: Contract analyzer
│   ├── detect_standard.js            ← ERC standard fingerprinting + risk flags
│   └── verify_contract.js            ← Capability 3: Pharosscan verifier
├── references/
│   ├── panic_codes.md                ← Solidity panic code table
│   ├── common_errors.md              ← Common ERC/contract errors
│   ├── erc_signatures.md             ← Known ERC function signatures
│   └── pharosscan_api.md             ← Pharosscan API endpoint reference
└── examples/
    ├── debug_require_fail.md
    ├── debug_custom_error.md
    ├── analyze_erc20.md
    └── verify_contract.md
```

---

## Dependencies

- **Node.js** ≥ 18.0.0
- **ethers** v6 — EVM provider and ABI decoding
- **axios** — Pharosscan API calls

---

## Revert Types Decoded

| Revert Pattern | 4-byte Selector | How Decoded |
|----------------|-----------------|-------------|
| `require(false, "message")` | `0x08c379a0` | ABI decode as `string` |
| Solidity Panic | `0x4e487b71` | Lookup in panic_codes table |
| Custom Error | Contract-specific | Matched against contract ABI |
| Empty revert | `0x` | Flagged as assertion/low-level revert |
| Out of Gas | N/A | Detected via gasUsed == gasLimit |

---

## License

MIT-0 — Free to use, modify, and redistribute. No attribution required.

---

## Submission

Built for the [Pharos Agent Center Skill Builder Campaign](https://www.pharos.xyz/agent-center).
