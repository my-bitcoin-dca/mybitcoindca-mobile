/**
 * Bitcoin Address Validation Utilities
 * Validates various Bitcoin address formats including Legacy, P2SH, SegWit, and Taproot
 */

// Bitcoin address format regex patterns
const BITCOIN_ADDRESS_PATTERNS = {
  // Legacy addresses (1...)
  LEGACY: /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
  // P2SH addresses (3...)
  P2SH: /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
  // Bech32 SegWit addresses (bc1q...) - lowercase only
  BECH32: /^(bc1q)[a-z0-9]{38,58}$/,
  // Taproot addresses (bc1p...) - always 62 characters total
  TAPROOT: /^(bc1p)[a-z0-9]{58}$/,
};

/**
 * Check if a Bitcoin address is valid
 * @param {string} address - The Bitcoin address to validate
 * @returns {boolean} True if the address is valid
 */
export function isValidBitcoinAddress(address) {
  // Allow empty/null address (optional field)
  if (!address || address.trim() === '') {
    return true;
  }

  const trimmedAddress = address.trim();

  return (
    BITCOIN_ADDRESS_PATTERNS.LEGACY.test(trimmedAddress) ||
    BITCOIN_ADDRESS_PATTERNS.P2SH.test(trimmedAddress) ||
    BITCOIN_ADDRESS_PATTERNS.BECH32.test(trimmedAddress) ||
    BITCOIN_ADDRESS_PATTERNS.TAPROOT.test(trimmedAddress)
  );
}

/**
 * Get a user-friendly error message for an invalid Bitcoin address
 * @param {string} address - The Bitcoin address to validate
 * @returns {string|null} Error message if invalid, null if valid
 */
export function getBitcoinAddressError(address) {
  if (!address || address.trim() === '') {
    return null;
  }

  const trimmedAddress = address.trim();

  // Check for whitespace
  if (address !== trimmedAddress) {
    return 'Address contains leading or trailing spaces. Please remove them.';
  }

  // Check if valid
  if (isValidBitcoinAddress(trimmedAddress)) {
    return null;
  }

  // Provide helpful error messages for common mistakes
  if (trimmedAddress.match(/^bc1[^qp]/i)) {
    return 'Bech32 addresses should start with "bc1q" (SegWit) or "bc1p" (Taproot)';
  } else if (trimmedAddress.match(/^[13]/)) {
    return 'Legacy/P2SH addresses must be 26-35 characters long (no 0, O, I, or l)';
  } else if (trimmedAddress.match(/^bc1/i) && /[^a-z0-9]/.test(trimmedAddress)) {
    return 'Bech32 addresses must contain only lowercase letters and numbers';
  } else if (trimmedAddress.match(/^BC1/)) {
    return 'Bech32 addresses must be lowercase';
  } else {
    return 'Please enter a valid Bitcoin address (starts with 1, 3, bc1q, or bc1p)';
  }
}

/**
 * Get the type of Bitcoin address
 * @param {string} address - The Bitcoin address
 * @returns {string|null} Address type or null if invalid
 */
export function getBitcoinAddressType(address) {
  if (!address || !isValidBitcoinAddress(address)) {
    return null;
  }

  const trimmedAddress = address.trim();

  if (BITCOIN_ADDRESS_PATTERNS.LEGACY.test(trimmedAddress)) {
    return 'legacy';
  } else if (BITCOIN_ADDRESS_PATTERNS.P2SH.test(trimmedAddress)) {
    return 'p2sh';
  } else if (BITCOIN_ADDRESS_PATTERNS.BECH32.test(trimmedAddress)) {
    return 'segwit';
  } else if (BITCOIN_ADDRESS_PATTERNS.TAPROOT.test(trimmedAddress)) {
    return 'taproot';
  }

  return null;
}
