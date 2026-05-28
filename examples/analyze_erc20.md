# Example: Analyzing an ERC20 Token Contract

## Scenario

A user wants to audit a token contract before interacting with it:

> *"What does the contract at 0xTokenAddr... do on Pharos mainnet? Is it safe?"*

---

## Script Output

```json
{
  "success": true,
  "contractAddress": "0xTokenAddr...",
  "network": "Pharos Mainnet",
  "verified": true,
  "contractName": "PharosToken",
  "compilerVersion": "v0.8.20+commit.a1b79de6",
  "licenseType": "MIT",
  "standards": ["ERC20", "Ownable"],
  "summary": "This contract (\"PharosToken\") implements a fungible token (ERC20). It uses simple ownership (Ownable) to restrict owner-only functions. It has 4 write function(s) and 6 read function(s).",
  "functions": {
    "read": [
      { "name": "name",        "signature": "name()",                       "payable": false },
      { "name": "symbol",      "signature": "symbol()",                     "payable": false },
      { "name": "decimals",    "signature": "decimals()",                   "payable": false },
      { "name": "totalSupply", "signature": "totalSupply()",                "payable": false },
      { "name": "balanceOf",   "signature": "balanceOf(address)",           "payable": false },
      { "name": "allowance",   "signature": "allowance(address,address)",   "payable": false }
    ],
    "write": [
      { "name": "transfer",      "signature": "transfer(address,uint256)",              "payable": false },
      { "name": "approve",       "signature": "approve(address,uint256)",               "payable": false },
      { "name": "transferFrom",  "signature": "transferFrom(address,address,uint256)",  "payable": false },
      { "name": "mint",          "signature": "mint(address,uint256)",                  "payable": false }
    ]
  },
  "events": ["Transfer", "Approval", "OwnershipTransferred"],
  "customErrors": [],
  "risks": [
    "⚠️  Owner/minter can mint tokens — verify there is a supply cap."
  ],
  "explorerUrl": "https://pharosscan.xyz/address/0xTokenAddr...",
  "sourceUrl": "https://pharosscan.xyz/address/0xTokenAddr...#code"
}
```

---

## Agent Response

```
🔍 Smart Contract Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━
Contract:    0xTokenAddr...
Network:     Pharos Mainnet
Verified:    ✅ Yes (MIT License, Solidity v0.8.20)
Standard:    ERC20 + Ownable

📋 What this contract does:
"PharosToken" is a standard fungible token (ERC20) with simple owner-based 
access control. It supports transfers, approvals, and allowances. The owner 
has the ability to mint new tokens.

📂 Key Functions:
  Read:  name, symbol, decimals, totalSupply, balanceOf, allowance
  Write: transfer, approve, transferFrom, mint (owner only)

⚠️  Risk Flags:
  - Owner/minter can mint tokens — verify there is a supply cap enforced in the contract.
    If there is no cap, the owner could inflate the supply at any time.

Pharosscan: https://pharosscan.xyz/address/0xTokenAddr...#code
```
