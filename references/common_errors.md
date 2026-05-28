# Common Smart Contract Errors Reference

A curated reference of the most frequently encountered smart contract errors on EVM chains, including their causes and fixes. Used by the `pharos-contract-intelligence` skill to generate actionable explanations.

---

## ERC20 Errors

| Error | Selector | Cause | Fix |
|-------|----------|-------|-----|
| `ERC20InsufficientBalance` | — | Sender's balance < amount being transferred | Ensure the sender holds enough tokens before transfer |
| `ERC20InsufficientAllowance` | — | `transferFrom` called but allowance is too low | Call `approve(spender, amount)` first |
| `ERC20InvalidSender` | — | Transfer from the zero address | Never initiate transfers from `address(0)` |
| `ERC20InvalidReceiver` | — | Transfer to the zero address | Validate the recipient is not `address(0)` |
| `ERC20InvalidApprover` | — | Approval from zero address | Ensure the approver is a valid address |
| `ERC20InvalidSpender` | — | Approval to zero address | Validate the spender address |

---

## ERC721 / NFT Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ERC721InvalidOwner` | Minting to `address(0)` | Validate the `to` address before minting |
| `ERC721NonexistentToken` | Token ID does not exist | Check `_exists(tokenId)` before querying or transferring |
| `ERC721IncorrectOwner` | Caller is not the token owner | Verify ownership with `ownerOf(tokenId)` before transfer |
| `ERC721InvalidSender` | Transfer from wrong address | Ensure the `from` parameter matches `ownerOf(tokenId)` |
| `ERC721InvalidReceiver` | Recipient cannot handle ERC721 | Ensure the recipient implements `IERC721Receiver` if it's a contract |
| `ERC721InsufficientApproval` | No approval to transfer token | Call `approve` or `setApprovalForAll` before `transferFrom` |

---

## Access Control Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Ownable: caller is not the owner` | `onlyOwner` function called by non-owner | Only call this function from the owner's wallet |
| `AccessControl: account X is missing role Y` | Role-gated function called without required role | Grant the role with `grantRole(ROLE, address)` from an admin |
| `Pausable: paused` | Function called while contract is paused | Wait for the contract to be unpaused (`unpause()`) |

---

## Reentrancy / Security Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ReentrancyGuard: reentrant call` | Function was called recursively | This is a security guard working correctly. Do not call this function from within itself |
| `SafeERC20: low-level call failed` | Token transfer returned `false` | The token contract rejected the transfer. Check approval and balance first |

---

## Custom Proxy / Upgrade Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ERC1967: new admin is the zero address` | Upgrade attempted with invalid admin | Provide a valid non-zero admin address |
| `UUPSUpgradeable: must not be called through delegatecall` | `upgradeTo` called incorrectly | Only call `upgradeTo` on the proxy, not the implementation directly |

---

## General Revert Patterns

| Pattern | Meaning | Fix |
|---------|---------|-----|
| Empty revert (`0x`) | `assert(false)` or plain `revert()` or out-of-gas | Check assert conditions and increase gas limit |
| `CALL_EXCEPTION` | Low-level call returned false | Inspect the called contract's logic and ensure it accepts the call |
| `INSUFFICIENT_FUNDS` | Sending more ETH/PHR than wallet balance | Reduce `value` or top up wallet |
| `NONCE_EXPIRED` | Transaction nonce already used | Reset nonce or wait for pending tx to confirm |
| `gas required exceeds allowance` | Gas estimation failed | The transaction would revert — debug the logic before sending |
