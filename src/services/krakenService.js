import CryptoJS from 'crypto-js';
import storage from '../utils/storage';
import { getKrakenPair } from '../utils/currency';

const KRAKEN_API_URL = 'https://api.kraken.com';

/**
 * Generate Kraken API signature
 * Kraken uses HMAC-SHA512 with a specific signing method:
 * HMAC-SHA512 of (URI path + SHA256(nonce + POST data)) using base64-decoded API secret
 */
function getKrakenSignature(path, postData, secret, nonce) {
  const message = String(nonce) + postData;
  const hash = CryptoJS.SHA256(message);

  // Properly concatenate path and hash as WordArrays to preserve binary data
  const pathWordArray = CryptoJS.enc.Latin1.parse(path);
  const hmacMessage = pathWordArray.concat(hash);

  const hmac = CryptoJS.HmacSHA512(
    hmacMessage,
    CryptoJS.enc.Base64.parse(secret)
  );
  return CryptoJS.enc.Base64.stringify(hmac);
}

/**
 * Make authenticated Kraken API request
 */
async function krakenRequest(endpoint, params = {}) {
  const apiKey = await storage.getItem('kraken_api_key');
  const apiSecret = await storage.getItem('kraken_api_secret');

  if (!apiKey || !apiSecret) {
    throw new Error('Kraken API keys not found. Please configure them first.');
  }

  const nonce = Date.now();
  const postData = new URLSearchParams({ ...params, nonce }).toString();
  const path = `/0/private/${endpoint}`;
  const signature = getKrakenSignature(path, postData, apiSecret, nonce);

  const response = await fetch(`${KRAKEN_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'API-Key': apiKey,
      'API-Sign': signature,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: postData,
  });

  const data = await response.json();

  if (data.error && data.error.length > 0) {
    throw new Error(data.error.join(', '));
  }

  return data.result;
}

/**
 * Make public Kraken API request (no auth needed)
 */
async function krakenPublicRequest(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${KRAKEN_API_URL}/0/public/${endpoint}${queryString ? '?' + queryString : ''}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error && data.error.length > 0) {
    throw new Error(data.error.join(', '));
  }

  return data.result;
}

/**
 * Store Kraken API keys securely on device
 * @param {string} apiKey - Kraken API key
 * @param {string} apiSecret - Kraken API secret (private key)
 */
export async function storeKrakenKeys(apiKey, apiSecret) {
  await storage.setItem('kraken_api_key', apiKey);
  await storage.setItem('kraken_api_secret', apiSecret);
}

/**
 * Check if Kraken API keys are stored
 * @returns {Promise<boolean>}
 */
export async function hasKrakenKeys() {
  const apiKey = await storage.getItem('kraken_api_key');
  return !!apiKey;
}

/**
 * Delete Kraken API keys from device
 */
export async function deleteKrakenKeys() {
  await storage.deleteItem('kraken_api_key');
  await storage.deleteItem('kraken_api_secret');
}

/**
 * Get account balances
 * @returns {Promise<Object>} Account info with balances
 */
export async function getAccountBalances() {
  try {
    const balances = await krakenRequest('Balance');

    // Convert Kraken balance format to array format similar to Binance
    const balanceArray = Object.entries(balances)
      .filter(([_, amount]) => parseFloat(amount) > 0)
      .map(([asset, amount]) => ({
        asset: asset.replace(/^X|^Z/, ''), // Remove Kraken prefixes (XXBT -> XBT, ZEUR -> EUR)
        free: amount,
        locked: '0',
      }));

    return {
      success: true,
      data: balanceArray,
    };
  } catch (error) {
    console.error('Error fetching Kraken balances:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get withdrawal fee for BTC
 * @returns {Promise<number>} Network fee
 */
export async function getWithdrawalFee() {
  try {
    const fees = await krakenRequest('WithdrawInfo', {
      asset: 'XBT',
      key: 'default', // This requires a pre-configured withdrawal address in Kraken
      amount: '0.001',
    });
    return parseFloat(fees.fee);
  } catch (error) {
    console.error('Error fetching Kraken withdrawal fee:', error);
    // Return a fallback fee if API call fails
    return 0.0005; // Typical BTC network fee
  }
}

/**
 * Execute Bitcoin withdrawal to hardware wallet
 * Note: Kraken requires withdrawal addresses to be pre-whitelisted
 *
 * @param {string} address - Bitcoin withdrawal address (must be whitelisted in Kraken as a "key")
 * @param {number} amount - Amount in BTC to withdraw
 * @returns {Promise<Object>} Withdrawal result
 */
export async function executeWithdrawal(address, amount) {
  try {
    // Kraken uses "keys" (named withdrawal addresses) instead of raw addresses
    // The address parameter here should be the key name configured in Kraken
    const result = await krakenRequest('Withdraw', {
      asset: 'XBT',
      key: address, // This is the withdrawal address key name in Kraken
      amount: amount.toString(),
    });

    return {
      success: true,
      data: {
        id: result.refid,
      },
    };
  } catch (error) {
    console.error('Kraken withdrawal error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Execute market buy order for BTC
 * Buys BTC using a fixed fiat amount in the specified currency
 *
 * @param {number} fiatAmount - Amount in fiat currency to spend (e.g., 35)
 * @param {number} tradingFeePercent - Trading fee percentage (e.g., 0.1 for 0.1%, 0.26 for 0.26%)
 * @param {string} currency - Currency code (e.g., 'EUR', 'USD', 'GBP')
 * @returns {Promise<Object>} Order result with execution details
 */
export async function executeMarketBuy(fiatAmount, tradingFeePercent = 0.26, currency = 'EUR') {
  try {
    // Get the Kraken trading pair for this currency
    const pair = getKrakenPair(currency);

    // Get current BTC price
    const ticker = await krakenPublicRequest('Ticker', { pair });
    const tickerData = Object.values(ticker)[0];
    const currentPrice = parseFloat(tickerData.a[0]); // Ask price

    // Get pair info for precision
    const assetPairs = await krakenPublicRequest('AssetPairs', { pair });
    const pairInfo = Object.values(assetPairs)[0];
    const lotDecimals = pairInfo.lot_decimals || 8;

    // Calculate BTC quantity to buy
    const rawQuantity = fiatAmount / currentPrice;
    const quantity = rawQuantity.toFixed(lotDecimals);

    // Execute market buy order
    const order = await krakenRequest('AddOrder', {
      pair: pair,
      type: 'buy',
      ordertype: 'market',
      volume: quantity,
    });

    // Get order details
    const txid = order.txid[0];

    // Query the order for execution details
    // Note: Market orders execute immediately, but we may need to wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    const closedOrders = await krakenRequest('ClosedOrders');
    const orderDetails = closedOrders.closed[txid];

    let totalBtc = 0;
    let totalFiat = 0;
    let totalFees = 0;

    if (orderDetails) {
      totalBtc = parseFloat(orderDetails.vol_exec);
      totalFiat = parseFloat(orderDetails.cost);
      totalFees = parseFloat(orderDetails.fee);
    } else {
      // Fallback calculation
      totalBtc = parseFloat(quantity);
      totalFiat = fiatAmount;
      totalFees = fiatAmount * (tradingFeePercent / 100);
    }

    const avgPrice = totalFiat / totalBtc;

    return {
      success: true,
      data: {
        orderId: txid,
        btcAmount: totalBtc,
        fiatSpent: totalFiat,
        currency: currency,
        avgPrice: avgPrice,
        tradingFee: totalFees,
        timestamp: new Date().toISOString(),
        // Keep eurSpent for backward compatibility
        eurSpent: totalFiat,
      },
    };
  } catch (error) {
    console.error('Kraken market buy order error:', error);
    return {
      success: false,
      error: error.message || error.toString(),
    };
  }
}
