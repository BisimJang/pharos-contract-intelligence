# Pharosscan API Reference

All API calls use the base URL: `https://pharosscan.xyz/api`

---

## Contract Module

### Get ABI
```
GET /api?module=contract&action=getabi&address=0x...
```
Returns the ABI of a verified contract.

**Response (success)**:
```json
{ "status": "1", "message": "OK", "result": "[{\"type\":\"function\",...}]" }
```
**Response (not verified)**:
```json
{ "status": "0", "message": "NOTOK", "result": "Contract source code not verified" }
```

---

### Get Source Code
```
GET /api?module=contract&action=getsourcecode&address=0x...
```
Returns source code, compiler version, optimization settings, and ABI.

**Response fields**:
- `SourceCode` — Solidity source (or JSON for multi-file)
- `ABI` — contract ABI JSON string
- `ContractName` — name of the main contract
- `CompilerVersion` — e.g. `v0.8.20+commit.a1b79de6`
- `OptimizationUsed` — `"1"` or `"0"`
- `Runs` — optimizer runs (e.g. `"200"`)
- `ConstructorArguments` — ABI-encoded constructor args
- `LicenseType` — SPDX license identifier

---

### Verify Source Code (Submit)
```
POST /api
Content-Type: application/x-www-form-urlencoded

module=contract
action=verifysourcecode
contractaddress=0x...
sourceCode=<solidity_source>
codeformat=solidity-single-file
contractname=MyContract
compilerversion=v0.8.20+commit.a1b79de6
optimizationUsed=1
runs=200
constructorArguements=<hex>   ← note: typo in API spec (Arguements)
licenseType=3
evmversion=default
```

**Response**:
```json
{ "status": "1", "message": "OK", "result": "<GUID>" }
```

**License type codes**:
| Code | License |
|------|---------|
| 1 | No License |
| 2 | The Unlicense |
| 3 | MIT |
| 4 | GNU GPLv2 |
| 5 | GNU GPLv3 |
| 6 | GNU LGPLv2.1 |
| 7 | GNU LGPLv3 |
| 8 | BSD-2-Clause |
| 9 | BSD-3-Clause |
| 10 | MPL-2.0 |
| 11 | OSL-3.0 |
| 12 | Apache-2.0 |
| 13 | GNU AGPLv3 |
| 14 | BSL 1.1 |

---

### Check Verification Status
```
GET /api?module=contract&action=checkverifystatus&guid=<GUID>
```

**Response results**:
- `"Pending in queue"` — still processing
- `"Pass - Verified"` — success ✅
- `"Already Verified"` — contract was already verified
- `"Fail - Unable to verify"` — verification failed ❌

---

## Transaction Module

### Get Transaction Receipt
```
GET /api?module=proxy&action=eth_getTransactionReceipt&txhash=0x...
```

### Get Transaction
```
GET /api?module=proxy&action=eth_getTransactionByHash&txhash=0x...
```

---

## Account Module

### Get ETH Balance
```
GET /api?module=account&action=balance&address=0x...&tag=latest
```

### Get Token Balance
```
GET /api?module=account&action=tokenbalance&contractaddress=0x...&address=0x...&tag=latest
```

### Get Transaction List
```
GET /api?module=account&action=txlist&address=0x...&startblock=0&endblock=latest&sort=desc
```
