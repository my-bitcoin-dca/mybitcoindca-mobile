/**
 * Exchange Service Factory
 * Provides a unified interface for interacting with different exchanges (Binance, Kraken)
 */

import * as binanceService from './binanceService';
import * as krakenService from './krakenService';
import storage from '../utils/storage';
import { getAvailableExchanges as getCountryExchanges } from '../config/countries';

// Exchange configuration
const ALL_EXCHANGES = [
  {
    id: 'binance',
    name: 'Binance',
    description: 'Largest crypto exchange by volume',
    tradingFee: 0.1, // 0.1% default
    website: 'https://www.binance.com',
    apiDocsUrl: 'https://www.binance.com/en/my/settings/api-management',
  },
  {
    id: 'kraken',
    name: 'Kraken',
    description: 'US-based exchange with strong security',
    tradingFee: 0.26, // 0.26% taker fee
    website: 'https://www.kraken.com',
    apiDocsUrl: 'https://www.kraken.com/u/security/api',
  },
];

// For backwards compatibility, export all exchanges
export const EXCHANGES = ALL_EXCHANGES;

/**
 * Get available exchanges for a specific country
 * @param {string} countryCode - ISO country code
 * @returns {Array} Array of exchange objects available in the country
 */
export function getExchangesForCountry(countryCode) {
  if (!countryCode) {
    return ALL_EXCHANGES; // Return all if no country set
  }
  const availableIds = getCountryExchanges(countryCode);
  return ALL_EXCHANGES.filter(e => availableIds.includes(e.id));
}

/**
 * Get available exchanges for user based on stored country
 * @param {string} userId - User ID for namespaced storage
 * @returns {Promise<Array>} Array of exchange objects available for the user
 */
export async function getAvailableExchangesForUser(userId) {
  const countryCode = await storage.getItem('user_country');
  return getExchangesForCountry(countryCode);
}

/**
 * Check if an exchange is available for the user's country
 * @param {string} exchangeId - Exchange identifier
 * @param {string} countryCode - ISO country code
 * @returns {boolean} True if exchange is available
 */
export function isExchangeAvailable(exchangeId, countryCode) {
  if (!countryCode) return true; // Allow if no country set
  const availableIds = getCountryExchanges(countryCode);
  return availableIds.includes(exchangeId);
}

/**
 * Get exchange info by ID
 */
export function getExchangeInfo(exchangeId) {
  return ALL_EXCHANGES.find(e => e.id === exchangeId) || ALL_EXCHANGES[0];
}

/**
 * Get storage key with optional user namespace
 * @param {string} baseKey - The base key name
 * @param {string} userId - Optional user ID for namespacing
 */
function getStorageKey(baseKey, userId) {
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Get the current selected exchange from storage
 * @param {string} userId - User ID for namespaced storage
 */
export async function getSelectedExchange(userId) {
  const exchange = await storage.getItem(getStorageKey('selected_exchange', userId));
  return exchange || 'binance';
}

/**
 * Set the selected exchange
 * @param {string} exchangeId - Exchange identifier
 * @param {string} userId - User ID for namespaced storage
 */
export async function setSelectedExchange(exchangeId, userId) {
  await storage.setItem(getStorageKey('selected_exchange', userId), exchangeId);
}

/**
 * Get the appropriate service for the current exchange
 */
function getService(exchangeId) {
  switch (exchangeId) {
    case 'kraken':
      return krakenService;
    case 'binance':
    default:
      return binanceService;
  }
}

/**
 * Store API keys for the specified exchange
 * @param {string} exchangeId - Exchange identifier
 * @param {string} apiKey - API key
 * @param {string} apiSecret - API secret
 * @param {string} userId - User ID for namespaced storage
 */
export async function storeExchangeKeys(exchangeId, apiKey, apiSecret, userId) {
  const service = getService(exchangeId);
  if (exchangeId === 'kraken') {
    await service.storeKrakenKeys(apiKey, apiSecret, userId);
  } else {
    await service.storeBinanceKeys(apiKey, apiSecret, userId);
  }
}

/**
 * Check if API keys exist for the specified exchange
 * @param {string} exchangeId - Exchange identifier
 * @param {string} userId - User ID for namespaced storage
 */
export async function hasExchangeKeys(exchangeId, userId) {
  const service = getService(exchangeId);
  if (exchangeId === 'kraken') {
    return await service.hasKrakenKeys(userId);
  } else {
    return await service.hasBinanceKeys(userId);
  }
}

/**
 * Delete API keys for the specified exchange
 * @param {string} exchangeId - Exchange identifier
 * @param {string} userId - User ID for namespaced storage
 */
export async function deleteExchangeKeys(exchangeId, userId) {
  const service = getService(exchangeId);
  if (exchangeId === 'kraken') {
    await service.deleteKrakenKeys(userId);
  } else {
    await service.deleteBinanceKeys(userId);
  }
}

/**
 * Get account balances from the specified exchange
 * @param {string} exchangeId - Exchange identifier
 * @param {string} userId - User ID for namespaced storage
 */
export async function getAccountBalances(exchangeId, userId) {
  const service = getService(exchangeId);
  return await service.getAccountBalances(userId);
}

/**
 * Get withdrawal fee for BTC from the specified exchange
 * @param {string} exchangeId - Exchange identifier
 * @param {string} userId - User ID for namespaced storage
 */
export async function getWithdrawalFee(exchangeId, userId) {
  const service = getService(exchangeId);
  return await service.getWithdrawalFee(userId);
}

/**
 * Execute withdrawal on the specified exchange
 * @param {string} exchangeId - Exchange identifier
 * @param {string} address - Withdrawal address
 * @param {number} amount - Amount to withdraw
 * @param {string} network - Network (default: BTC)
 * @param {string} userId - User ID for namespaced storage
 */
export async function executeWithdrawal(exchangeId, address, amount, network = 'BTC', userId) {
  const service = getService(exchangeId);
  if (exchangeId === 'kraken') {
    // Kraken doesn't use network parameter the same way
    return await service.executeWithdrawal(address, amount, userId);
  } else {
    return await service.executeWithdrawal(address, amount, network, userId);
  }
}

/**
 * Execute market buy order on the specified exchange
 * @param {string} exchangeId - Exchange identifier
 * @param {number} fiatAmount - Amount in fiat to spend
 * @param {number} tradingFeePercent - Trading fee percentage
 * @param {string} currency - Currency code
 * @param {string} userId - User ID for namespaced storage
 */
export async function executeMarketBuy(exchangeId, fiatAmount, tradingFeePercent, currency, userId) {
  const service = getService(exchangeId);
  return await service.executeMarketBuy(fiatAmount, tradingFeePercent, currency, userId);
}

/**
 * Get trading fees for the specified exchange
 * @param {string} exchangeId - Exchange identifier
 * @param {string} userId - User ID for namespaced storage
 * @returns {Promise<{success: boolean, data: {makerFee: number, takerFee: number}}>}
 */
export async function getTradingFees(exchangeId, userId) {
  const service = getService(exchangeId);
  if (typeof service.getTradingFees === 'function') {
    return await service.getTradingFees(userId);
  }
  // Fall back to hardcoded fees for exchanges without API support
  const exchangeInfo = getExchangeInfo(exchangeId);
  return {
    success: true,
    data: {
      makerFee: exchangeInfo.tradingFee,
      takerFee: exchangeInfo.tradingFee,
    }
  };
}

/**
 * Get API key setup instructions for an exchange
 */
export function getApiKeyInstructions(exchangeId) {
  if (exchangeId === 'kraken') {
    return [
      '1. Log in to Kraken.com',
      '2. Go to Security → API',
      '3. Click "Add Key"',
      '4. Set a descriptive name',
      '5. Enable "Query Funds" permission',
      '6. Enable "Create & Modify Orders" permission',
      '7. Enable "Withdraw Funds" ONLY if App Withdrawal Mode is ON',
      '8. Set IP whitelist for additional security (recommended)',
      '9. Note: For withdrawals, you must pre-configure withdrawal addresses in Kraken',
    ];
  }

  // Binance instructions
  return [
    '1. Log in to Binance.com',
    '2. Go to Profile → API Management',
    '3. Create a new API key',
    '4. Enable "Enable Spot & Margin Trading" (required)',
    '5. Enable "Enable Withdrawals" ONLY if App Withdrawal Mode is ON',
    '6. Do NOT enable "Enable Withdrawals" if App Withdrawal Mode is OFF',
    '7. Whitelist a dedicated IP (recommended: use a VPN service with a static IP)',
  ];
}

/**
 * Get withdrawal notes for an exchange
 */
export function getWithdrawalNotes(exchangeId) {
  if (exchangeId === 'kraken') {
    return {
      title: 'Kraken Withdrawal Setup',
      notes: [
        'Kraken requires withdrawal addresses to be pre-configured in your account settings.',
        'Go to Funding → Withdraw → Bitcoin → Add Address',
        'Add your hardware wallet address and give it a name (e.g., "Hardware Wallet")',
        'Use this exact name when entering your withdrawal address in the app',
      ],
    };
  }

  return {
    title: 'Binance Withdrawal Setup',
    notes: [
      'Enter your Bitcoin wallet address directly',
      'Make sure "Enable Withdrawals" is enabled in your API key settings',
      'Whitelist your withdrawal address in Binance for added security',
    ],
  };
}
