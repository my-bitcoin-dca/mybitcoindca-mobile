import CryptoJS from 'crypto-js';
import storage from '../utils/storage';
import { getBinancePair } from '../utils/currency';

const BINANCE_API_URL = 'https://api.binance.com';

/**
 * Make a signed request to Binance SAPI (new API endpoints)
 * The library uses deprecated WAPI endpoints, so we need to make direct calls for some functions
 */
async function binanceSapiRequest(endpoint, params = {}, method = 'POST', userId) {
  const apiKey = await storage.getItem(getStorageKey('binance_api_key', userId));
  const apiSecret = await storage.getItem(getStorageKey('binance_api_secret', userId));

  if (!apiKey || !apiSecret) {
    throw new Error('Binance API keys not found. Please configure them first.');
  }

  // Add timestamp and recvWindow
  const timestamp = Date.now();
  const queryParams = {
    ...params,
    timestamp,
    recvWindow: 60000,
  };

  // Create query string
  const queryString = Object.keys(queryParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  // Generate signature
  const signature = CryptoJS.HmacSHA256(queryString, apiSecret).toString(CryptoJS.enc.Hex);
  const signedQueryString = `${queryString}&signature=${signature}`;

  const url = `${BINANCE_API_URL}${endpoint}?${signedQueryString}`;

  const response = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Binance API returned non-JSON response:', text.substring(0, 200));
    throw new Error(`Binance API error: ${response.status} - received non-JSON response. Please try again.`);
  }

  const data = await response.json();

  if (data.code && data.code < 0) {
    throw new Error(data.msg || `Binance error code: ${data.code}`);
  }

  return data;
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
 * Store Binance API keys securely on device
 * @param {string} apiKey - Binance API key
 * @param {string} apiSecret - Binance API secret
 * @param {string} userId - User ID for namespaced key storage
 */
export async function storeBinanceKeys(apiKey, apiSecret, userId) {
  await storage.setItem(getStorageKey('binance_api_key', userId), apiKey);
  await storage.setItem(getStorageKey('binance_api_secret', userId), apiSecret);
}

/**
 * Check if Binance API keys are stored
 * @param {string} userId - User ID for namespaced key storage
 * @returns {Promise<boolean>}
 */
export async function hasBinanceKeys(userId) {
  const apiKey = await storage.getItem(getStorageKey('binance_api_key', userId));
  return !!apiKey;
}

/**
 * Delete Binance API keys from device
 * @param {string} userId - User ID for namespaced key storage
 */
export async function deleteBinanceKeys(userId) {
  await storage.deleteItem(getStorageKey('binance_api_key', userId));
  await storage.deleteItem(getStorageKey('binance_api_secret', userId));
}

/**
 * Execute Bitcoin withdrawal to hardware wallet
 * This executes directly from the phone to Binance
 * Server never sees the API keys
 *
 * NOTE: Uses direct SAPI call instead of the library's deprecated WAPI endpoint
 * The old WAPI endpoint /wapi/v3/withdraw.html is deprecated
 * New endpoint: /sapi/v1/capital/withdraw/apply
 *
 * @param {string} address - Bitcoin withdrawal address
 * @param {number} amount - Amount in BTC to withdraw
 * @param {string} network - Network (default: BTC)
 * @param {string} userId - User ID for namespaced key storage
 * @returns {Promise<Object>} Withdrawal result
 */
export async function executeWithdrawal(address, amount, network = 'BTC', userId) {
  try {
    // Use new SAPI endpoint directly (library uses deprecated WAPI)
    const result = await binanceSapiRequest(
      '/sapi/v1/capital/withdraw/apply',
      {
        coin: 'BTC',
        network: network,
        address: address,
        amount: amount,
      },
      'POST',
      userId
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const errorMsg = error.message || error.toString();
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Get account balances using direct API call
 * @param {string} userId - User ID for namespaced key storage
 * @returns {Promise<Object>} Account info with balances
 */
export async function getAccountBalances(userId) {
  const apiKey = await storage.getItem(getStorageKey('binance_api_key', userId));
  const apiSecret = await storage.getItem(getStorageKey('binance_api_secret', userId));

  if (!apiKey || !apiSecret) {
    return {
      success: false,
      error: 'Binance API keys not found. Please configure them first.',
    };
  }

  try {
    // Use direct API call instead of library for better error handling
    const timestamp = Date.now();
    const queryParams = {
      timestamp,
      recvWindow: 60000,
    };

    const queryString = Object.keys(queryParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');

    const signature = CryptoJS.HmacSHA256(queryString, apiSecret).toString(CryptoJS.enc.Hex);
    const signedQueryString = `${queryString}&signature=${signature}`;

    const url = `${BINANCE_API_URL}/api/v3/account?${signedQueryString}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    });

    // Log response details for debugging
    const responseText = await response.text();
    console.log('[Binance] Account API response status:', response.status);
    console.log('[Binance] Account API response length:', responseText.length);

    if (!responseText || responseText.length === 0) {
      console.error('[Binance] Empty response received');
      return {
        success: false,
        error: 'Binance returned an empty response. This usually indicates your IP is blocked or there are network issues. Please check your VPN connection and IP whitelist.',
      };
    }

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Binance] Failed to parse response:', responseText.substring(0, 500));
      return {
        success: false,
        error: `Binance returned invalid response (status ${response.status}). This may indicate IP blocking or API issues.`,
      };
    }

    // Check for API error
    if (data.code && data.code < 0) {
      console.error('[Binance] API error:', data);
      return {
        success: false,
        error: data.msg || `Binance error code: ${data.code}`,
      };
    }

    return {
      success: true,
      data: data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0),
    };
  } catch (error) {
    const errorMsg = error.message || error.toString();
    console.error('[Binance] Connection error:', errorMsg);
    return {
      success: false,
      error: `Connection failed: ${errorMsg}`,
    };
  }
}

/**
 * Get withdrawal fee for BTC
 * Uses new SAPI endpoint: /sapi/v1/capital/config/getall
 * @param {string} userId - User ID for namespaced key storage
 * @returns {Promise<number>} Network fee
 */
export async function getWithdrawalFee(userId) {
  try {
    // Use new SAPI endpoint to get coin info including withdrawal fees
    const coins = await binanceSapiRequest(
      '/sapi/v1/capital/config/getall',
      {},
      'GET',
      userId
    );

    // Find BTC in the response
    const btcInfo = coins.find(c => c.coin === 'BTC');
    if (btcInfo && btcInfo.networkList) {
      // Find the BTC network (not Lightning or other L2)
      const btcNetwork = btcInfo.networkList.find(n => n.network === 'BTC');
      if (btcNetwork && btcNetwork.withdrawFee) {
        return parseFloat(btcNetwork.withdrawFee);
      }
    }

    // Fallback if parsing fails
    return 0.0005;
  } catch (error) {
    // Log error for debugging but return fallback fee
    const errorMsg = error.message || error.toString();
    console.warn('Failed to fetch withdrawal fee from Binance:', errorMsg);
    // Return a fallback fee if API call fails
    return 0.0005; // Typical BTC network fee
  }
}

/**
 * Execute market buy order for BTC using direct API calls
 * Buys BTC using a fixed fiat amount in the specified currency
 *
 * @param {number} fiatAmount - Amount in fiat currency to spend (e.g., 35)
 * @param {number} _tradingFeePercent - Trading fee percentage (unused - Binance deducts automatically)
 * @param {string} currency - Currency code (e.g., 'EUR', 'USD', 'GBP')
 * @param {string} userId - User ID for namespaced key storage
 * @returns {Promise<Object>} Order result with execution details
 */
export async function executeMarketBuy(fiatAmount, _tradingFeePercent = 0.1, currency = 'EUR', userId) {
  const apiKey = await storage.getItem(getStorageKey('binance_api_key', userId));
  const apiSecret = await storage.getItem(getStorageKey('binance_api_secret', userId));

  if (!apiKey || !apiSecret) {
    return {
      success: false,
      error: 'Binance API keys not found. Please configure them first.',
    };
  }

  try {
    // Get the Binance trading pair for this currency
    const symbol = getBinancePair(currency);

    // Get current BTC price (public endpoint)
    const priceRes = await fetch(`${BINANCE_API_URL}/api/v3/ticker/price?symbol=${symbol}`);
    const priceData = await priceRes.json();
    if (priceData.code && priceData.code < 0) {
      return { success: false, error: priceData.msg || 'Failed to get price' };
    }
    const currentPrice = parseFloat(priceData.price);

    // Get symbol info (public endpoint)
    const infoRes = await fetch(`${BINANCE_API_URL}/api/v3/exchangeInfo?symbol=${symbol}`);
    const exchangeInfo = await infoRes.json();
    if (exchangeInfo.code && exchangeInfo.code < 0) {
      return { success: false, error: exchangeInfo.msg || 'Failed to get exchange info' };
    }
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);

    // Find LOT_SIZE filter to get step size (quantity precision)
    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    const stepSize = parseFloat(lotSizeFilter.stepSize);

    // Find NOTIONAL filter to get minimum order value
    const notionalFilter = symbolInfo.filters.find(f => f.filterType === 'NOTIONAL');
    const minNotional = notionalFilter ? parseFloat(notionalFilter.minNotional) : 5;

    // Check if order meets minimum notional value
    if (fiatAmount < minNotional) {
      return {
        success: false,
        error: `Order value ${fiatAmount} ${currency} is below Binance minimum of ${minNotional} ${currency}. Please increase your DCA amount.`,
      };
    }

    // Calculate precision from step size (e.g., 0.00001 = 5 decimals)
    const precision = Math.abs(Math.log10(stepSize));

    // Calculate BTC quantity to buy
    const rawQuantity = fiatAmount / currentPrice;

    // Round down to the correct precision
    const quantity = Math.floor(rawQuantity * Math.pow(10, precision)) / Math.pow(10, precision);

    // Double-check the notional value after rounding
    const orderValue = quantity * currentPrice;
    if (orderValue < minNotional) {
      return {
        success: false,
        error: `Order value ${orderValue.toFixed(2)} ${currency} is below Binance minimum of ${minNotional} ${currency} after rounding. Please increase your DCA amount slightly.`,
      };
    }

    // Execute market buy order (authenticated endpoint)
    const timestamp = Date.now();
    const orderParams = {
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quantity: quantity.toFixed(precision),
      timestamp,
      recvWindow: 60000,
    };

    const queryString = Object.keys(orderParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(orderParams[key])}`)
      .join('&');

    const signature = CryptoJS.HmacSHA256(queryString, apiSecret).toString(CryptoJS.enc.Hex);
    const signedQueryString = `${queryString}&signature=${signature}`;

    const orderRes = await fetch(`${BINANCE_API_URL}/api/v3/order?${signedQueryString}`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    });

    const orderText = await orderRes.text();
    if (!orderText || orderText.length === 0) {
      return {
        success: false,
        error: 'Binance returned an empty response. Please check your network connection and try again.',
      };
    }

    const order = JSON.parse(orderText);
    if (order.code && order.code < 0) {
      return { success: false, error: order.msg || `Binance error: ${order.code}` };
    }

    // Calculate actual execution details from fills
    let totalBtc = 0;
    let totalFiat = 0;
    let totalFeesBtc = 0;

    if (order.fills && order.fills.length > 0) {
      order.fills.forEach(fill => {
        totalBtc += parseFloat(fill.qty);
        totalFiat += parseFloat(fill.price) * parseFloat(fill.qty);
        totalFeesBtc += parseFloat(fill.commission); // Commission in BTC
      });
    } else {
      // Fallback to order-level data if fills not available
      totalBtc = parseFloat(order.executedQty);
      totalFiat = parseFloat(order.cummulativeQuoteQty);
    }

    // Calculate average execution price
    const avgPrice = totalFiat / totalBtc;

    // Net BTC after fee deduction (Binance deducts fee from BTC balance)
    const netBtc = totalBtc - totalFeesBtc;

    // Convert trading fee from BTC to fiat (for display purposes)
    const tradingFeeInFiat = totalFeesBtc * avgPrice;

    return {
      success: true,
      data: {
        orderId: order.orderId,
        btcAmount: netBtc, // Net BTC after fee
        fiatSpent: totalFiat,
        currency: currency,
        avgPrice: avgPrice,
        tradingFee: tradingFeeInFiat, // Fee in fiat (for backward compatibility)
        tradingFeeBtc: totalFeesBtc, // Fee in BTC (actual amount deducted)
        timestamp: new Date(order.transactTime).toISOString(),
        fills: order.fills,
        // Keep eurSpent for backward compatibility with older mobile app versions
        eurSpent: totalFiat,
      },
    };
  } catch (error) {
    const errorMsg = error.message || error.toString();
    console.error('[Binance] Market buy error:', errorMsg);
    return {
      success: false,
      error: `Order failed: ${errorMsg}`,
    };
  }
}
