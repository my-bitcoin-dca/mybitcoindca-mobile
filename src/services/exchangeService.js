/**
 * Exchange Service Factory
 * Provides a unified interface for interacting with different exchanges (Binance, Kraken)
 */

import * as binanceService from './binanceService';
import * as krakenService from './krakenService';
import storage from '../utils/storage';

// Exchange configuration
export const EXCHANGES = [
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

/**
 * Get exchange info by ID
 */
export function getExchangeInfo(exchangeId) {
  return EXCHANGES.find(e => e.id === exchangeId) || EXCHANGES[0];
}

/**
 * Get the current selected exchange from storage
 */
export async function getSelectedExchange() {
  const exchange = await storage.getItem('selected_exchange');
  return exchange || 'binance';
}

/**
 * Set the selected exchange
 */
export async function setSelectedExchange(exchangeId) {
  await storage.setItem('selected_exchange', exchangeId);
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
 */
export async function storeExchangeKeys(exchangeId, apiKey, apiSecret) {
  const service = getService(exchangeId);
  if (exchangeId === 'kraken') {
    await service.storeKrakenKeys(apiKey, apiSecret);
  } else {
    await service.storeBinanceKeys(apiKey, apiSecret);
  }
}

/**
 * Check if API keys exist for the specified exchange
 */
export async function hasExchangeKeys(exchangeId) {
  const service = getService(exchangeId);
  if (exchangeId === 'kraken') {
    return await service.hasKrakenKeys();
  } else {
    return await service.hasBinanceKeys();
  }
}

/**
 * Delete API keys for the specified exchange
 */
export async function deleteExchangeKeys(exchangeId) {
  const service = getService(exchangeId);
  if (exchangeId === 'kraken') {
    await service.deleteKrakenKeys();
  } else {
    await service.deleteBinanceKeys();
  }
}

/**
 * Get account balances from the specified exchange
 */
export async function getAccountBalances(exchangeId) {
  const service = getService(exchangeId);
  return await service.getAccountBalances();
}

/**
 * Get withdrawal fee for BTC from the specified exchange
 */
export async function getWithdrawalFee(exchangeId) {
  const service = getService(exchangeId);
  return await service.getWithdrawalFee();
}

/**
 * Execute withdrawal on the specified exchange
 */
export async function executeWithdrawal(exchangeId, address, amount, network = 'BTC') {
  const service = getService(exchangeId);
  if (exchangeId === 'kraken') {
    // Kraken doesn't use network parameter the same way
    return await service.executeWithdrawal(address, amount);
  } else {
    return await service.executeWithdrawal(address, amount, network);
  }
}

/**
 * Execute market buy order on the specified exchange
 */
export async function executeMarketBuy(exchangeId, fiatAmount, tradingFeePercent, currency) {
  const service = getService(exchangeId);
  return await service.executeMarketBuy(fiatAmount, tradingFeePercent, currency);
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
