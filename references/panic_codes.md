# Solidity Panic Codes Reference

When a Solidity contract throws a `Panic(uint256)` error (selector `0x4e487b71`), the numeric code tells you exactly what went wrong. This reference maps every official panic code to a plain-English explanation and a suggested fix.

---

| Code | Hex | What It Means | Suggested Fix |
|------|-----|---------------|---------------|
| 0 | `0x00` | Generic panic — usually a compiler-inserted check | Check for unreachable code paths or update your compiler version |
| 1 | `0x01` | `assert()` statement failed | Review your `assert()` conditions — they should only be `false` if there is a bug in the code |
| 17 | `0x11` | Arithmetic overflow or underflow | Use Solidity 0.8+ (built-in overflow checks), or use OpenZeppelin's `SafeMath` for older versions |
| 18 | `0x12` | Division or modulo by zero | Guard the divisor: `require(divisor != 0, "Cannot divide by zero")` |
| 33 | `0x21` | Invalid enum conversion — integer value out of enum range | Validate the integer input before casting: `require(val < uint(type(MyEnum).max))` |
| 34 | `0x22` | Incorrectly encoded storage byte array | Avoid direct low-level storage manipulation of dynamic byte arrays |
| 49 | `0x31` | `.pop()` called on an empty array | Check `array.length > 0` before calling `.pop()` |
| 50 | `0x32` | Array index access out of bounds | Validate the index: `require(i < array.length, "Index out of bounds")` |
| 65 | `0x41` | Too much memory allocated (e.g. massive array) | Reduce in-memory array/struct sizes; use storage variables for large datasets |
| 81 | `0x51` | Called an uninitialized internal function pointer | Ensure all function pointers are assigned before being called |

---

## How Panic Codes Appear

In a raw revert, a panic looks like:
```
0x4e487b71
0000000000000000000000000000000000000000000000000000000000000011
```
- `0x4e487b71` = `Panic(uint256)` selector
- `0x11` = code 17 decimal = arithmetic overflow

---

## Example: Overflow Panic

```solidity
// This will panic with code 0x11 if a + b overflows
function add(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b; // Solidity 0.8+ auto-reverts on overflow
}
```

**Fix**: This is actually safe in Solidity 0.8+. If you're getting this panic, the inputs genuinely overflow `uint256`. Validate inputs upstream.
