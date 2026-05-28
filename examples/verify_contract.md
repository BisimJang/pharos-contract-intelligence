# Example: Verifying a Smart Contract on Pharosscan

## Scenario

A developer just deployed a contract and wants it verified:

> *"Verify my contract at 0xDeployed... on Pharos testnet. It's called SimpleStorage, compiled with v0.8.20, optimization on, 200 runs. Here's the source."*

---

## Script Command

```bash
node scripts/verify_contract.js \
  --contract 0xDeployed... \
  --source ./SimpleStorage.sol \
  --name SimpleStorage \
  --compiler v0.8.20+commit.a1b79de6 \
  --network testnet \
  --optimization true \
  --runs 200 \
  --license mit
```

---

## Script Output (Success)

```json
{
  "success": true,
  "contractAddress": "0xDeployed...",
  "network": "Pharos Testnet",
  "status": "✅ Verified",
  "message": "Verification successful!",
  "contractName": "SimpleStorage",
  "compilerVersion": "v0.8.20+commit.a1b79de6",
  "explorerUrl": "https://pharosscan.xyz/address/0xDeployed...",
  "sourceUrl": "https://pharosscan.xyz/address/0xDeployed...#code"
}
```

---

## Agent Response (Success)

```
✅ Contract Verification Result
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contract:    0xDeployed...
Network:     Pharos Testnet
Status:      ✅ Verified Successfully

Your contract "SimpleStorage" is now publicly verified on Pharosscan.
Anyone can inspect the source code and interact with it transparently.

View on Pharosscan:
  https://pharosscan.xyz/address/0xDeployed...#code
```

---

## Script Output (Failure — Bytecode Mismatch)

```json
{
  "success": false,
  "contractAddress": "0xDeployed...",
  "network": "Pharos Testnet",
  "status": "❌ Verification Failed",
  "error": "Fail - Unable to verify. Bytecode does not match.",
  "fix": "The compiled bytecode doesn't match the deployed bytecode. Check: (1) correct compiler version, (2) exact optimization settings (runs count), (3) constructor arguments, (4) all imports are flattened into the source file.",
  "explorerUrl": "https://pharosscan.xyz/address/0xDeployed..."
}
```

---

## Agent Response (Failure)

```
❌ Contract Verification Failed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contract:    0xDeployed...
Network:     Pharos Testnet
Status:      ❌ Bytecode mismatch

What went wrong:
The source code you provided compiles to different bytecode than what 
was actually deployed on-chain.

How to fix this:
1. Double-check the exact compiler version used during deployment
   (check your hardhat.config.js or foundry.toml)
2. Verify optimization settings match exactly (enabled: true, runs: 200)
3. If your contract imports other files, flatten them first:
     forge flatten src/SimpleStorage.sol > SimpleStorage_flat.sol
4. If your contract has constructor arguments, provide them as 
   ABI-encoded hex via --constructor-args
```
