# Example: Debugging a require() Failure

## Scenario

A developer calls a token transfer function but gets a transaction failure. They ask the agent:

> *"Why did transaction `0xabc123...` fail on Pharos testnet?"*

---

## Script Output

```json
{
  "success": false,
  "txHash": "0xabc123...",
  "network": "Pharos Testnet",
  "status": "❌ Failed",
  "contract": "0xTokenContract...",
  "abiSource": "Pharosscan (verified)",
  "gasUsed": "28500",
  "gasLimit": "100000",
  "revertType": "require",
  "message": "Require failed: \"ERC20: transfer amount exceeds balance\"",
  "details": {
    "requireMessage": "ERC20: transfer amount exceeds balance"
  },
  "fix": "The condition guarded by require() was false. Look for a require() statement that checks: \"ERC20: transfer amount exceeds balance\" and ensure its condition is satisfied before calling the function.",
  "explorerUrl": "https://pharosscan.xyz/tx/0xabc123..."
}
```

---

## Agent Response

```
🐛 Transaction Debug Report
━━━━━━━━━━━━━━━━━━━━━━━━━━
TX Hash:     0xabc123...
Network:     Pharos Testnet
Status:      ❌ Failed

Revert Type: require()
Error:       "ERC20: transfer amount exceeds balance"

What happened:
The transaction failed because the sender's token balance is less than the 
amount they tried to transfer. This is a standard ERC20 safety check.

Suggested Fix:
Check the sender's balance before initiating the transfer:
  await token.balanceOf(senderAddress)  // must be >= transfer amount
Also verify that the correct wallet is signing the transaction.

Pharosscan: https://pharosscan.xyz/tx/0xabc123...
```
