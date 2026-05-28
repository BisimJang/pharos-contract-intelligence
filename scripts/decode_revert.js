// decode_revert.js — Decodes raw revert bytes from a failed EVM transaction.
// Handles: require() strings, Solidity panic codes, custom errors, and empty reverts.

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Known 4-byte selectors ───────────────────────────────────────────────────
const REQUIRE_SELECTOR = "0x08c379a0"; // Error(string)
const PANIC_SELECTOR   = "0x4e487b71"; // Panic(uint256)

// ─── Panic code descriptions ──────────────────────────────────────────────────
const PANIC_CODES = {
  "0x00": { reason: "Generic compiler-inserted panic",          fix: "Check for unreachable code or compiler bugs." },
  "0x01": { reason: "Failed assert() statement",               fix: "Review your assert() conditions — they should never be false in normal operation." },
  "0x11": { reason: "Arithmetic overflow or underflow",        fix: "Use Solidity 0.8+ (built-in checks) or validate inputs before arithmetic." },
  "0x12": { reason: "Division or modulo by zero",              fix: "Guard the divisor: require(divisor != 0, 'Cannot divide by zero')." },
  "0x21": { reason: "Invalid enum value conversion",           fix: "Validate that the integer value is within the enum's valid range before casting." },
  "0x22": { reason: "Incorrectly encoded storage byte array",  fix: "Avoid direct low-level manipulation of storage bytes arrays." },
  "0x31": { reason: "pop() called on an empty array",          fix: "Check array.length > 0 before calling .pop()." },
  "0x32": { reason: "Array index out of bounds",               fix: "Validate the index: require(i < array.length, 'Index out of bounds')." },
  "0x41": { reason: "Out of memory (allocating too much)",     fix: "Reduce the size of in-memory arrays or structs. Consider using storage instead." },
  "0x51": { reason: "Called an uninitialized internal function pointer", fix: "Ensure the function pointer is assigned before it is called." },
};

/**
 * Decode raw revert data returned by eth_call or provider.call().
 * @param {string} revertData - hex string from the RPC (e.g. "0x08c379a0...")
 * @param {object[]|null} abi - optional contract ABI array for custom error decoding
 * @returns {object} decoded result
 */
export function decodeRevert(revertData, abi = null) {
  if (!revertData || revertData === "0x" || revertData === "") {
    return {
      revertType: "empty",
      message: "Transaction reverted without a reason string.",
      details: null,
      fix: "This usually indicates a failed assert(), an explicit revert(), or the contract ran out of gas. Check your assert() statements and gas limit.",
    };
  }

  const selector = revertData.slice(0, 10).toLowerCase();

  // ── require(false, "message") → Error(string) ──────────────────────────────
  if (selector === REQUIRE_SELECTOR) {
    try {
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const [message] = abiCoder.decode(["string"], "0x" + revertData.slice(10));
      return {
        revertType: "require",
        message: `Require failed: "${message}"`,
        details: { requireMessage: message },
        fix: `The condition guarded by require() was false. Look for a require() statement that checks: "${message}" and ensure its condition is satisfied before calling the function.`,
      };
    } catch {
      return {
        revertType: "require",
        message: "Require failed (could not decode message).",
        details: { raw: revertData },
        fix: "A require() statement failed. Could not decode the message — ensure the ABI encoding is correct.",
      };
    }
  }

  // ── Panic(uint256) ─────────────────────────────────────────────────────────
  if (selector === PANIC_SELECTOR) {
    try {
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const [codeRaw] = abiCoder.decode(["uint256"], "0x" + revertData.slice(10));
      const codeHex = "0x" + codeRaw.toString(16).padStart(2, "0");
      const info = PANIC_CODES[codeHex] || {
        reason: `Unknown panic code (${codeHex})`,
        fix: "Consult the Solidity documentation for panic error codes.",
      };
      return {
        revertType: "panic",
        message: `Solidity Panic ${codeHex}: ${info.reason}`,
        details: { panicCode: codeHex, ...info },
        fix: info.fix,
      };
    } catch {
      return {
        revertType: "panic",
        message: "Solidity Panic (could not decode panic code).",
        details: { raw: revertData },
        fix: "A Solidity panic was thrown. Review arithmetic operations, array accesses, and assert() statements.",
      };
    }
  }

  // ── Custom Error ───────────────────────────────────────────────────────────
  if (abi && Array.isArray(abi)) {
    const iface = new ethers.Interface(abi);
    try {
      const parsed = iface.parseError(revertData);
      if (parsed) {
        const args = parsed.args
          ? Object.fromEntries([...parsed.args.entries()].map(([k, v]) => [k, v.toString()]))
          : {};
        return {
          revertType: "customError",
          message: `Custom Error: ${parsed.name}`,
          details: { errorName: parsed.name, args },
          fix: `The contract threw the custom error "${parsed.name}". Check the contract's error definitions and the conditions that trigger this error.`,
        };
      }
    } catch {
      // ABI didn't match — fall through to unknown
    }
  }

  // ── Unknown / raw selector ─────────────────────────────────────────────────
  return {
    revertType: "unknown",
    message: `Unknown revert with selector ${selector}`,
    details: { selector, raw: revertData },
    fix: "The revert selector is not recognized. Provide the contract ABI to decode custom errors, or check the contract source code for errors matching this selector.",
  };
}

// ─── CLI usage ────────────────────────────────────────────────────────────────
// node scripts/decode_revert.js --data 0x08c379a0... [--abi path/to/abi.json]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dataIdx = args.indexOf("--data");
  const abiIdx  = args.indexOf("--abi");

  if (dataIdx === -1) {
    console.error("Usage: node scripts/decode_revert.js --data <hex> [--abi path/to/abi.json]");
    process.exit(1);
  }

  const rawData = args[dataIdx + 1];
  let abi = null;
  if (abiIdx !== -1 && args[abiIdx + 1]) {
    abi = JSON.parse(readFileSync(args[abiIdx + 1], "utf8"));
  }

  const result = decodeRevert(rawData, abi);
  console.log(JSON.stringify(result, null, 2));
}
