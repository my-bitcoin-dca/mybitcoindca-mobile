import Binance from 'binance-api-react-native';
import storage from '../utils/storage';
import { getBinancePair } from '../utils/currency';

/**
 * Get Binance client using keys stored on device
 * These are FULL-ACCESS keys (including withdrawal permissions)
 * They NEVER leave the device
 */
export async function getBinanceClient() {
  const apiKey = await storage.getItem('binance_api_key');
  const apiSecret = await storage.getItem('binance_api_secret');

  if (!apiKey || !apiSecret) {
    throw new Error('Binance API keys not found. Please configure them first.');
  }

  return Binance({
    apiKey,
    apiSecret,
    useServerTime: true, // Sync with Binance server time to avoid timestamp errors
    recvWindow: 60000, // Allow 60 second window for clock drift
  });
}

/**
 * Store Binance API keys securely on device
 * @param {string} apiKey - Binance API key
 * @param {string} apiSecret - Binance API secret
 */
export async function storeBinanceKeys(apiKey, apiSecret) {
  await storage.setItem('binance_api_key', apiKey);
  await storage.setItem('binance_api_secret', apiSecret);
}

/**
 * Check if Binance API keys are stored
 * @returns {Promise<boolean>}
 */
export async function hasBinanceKeys() {
  const apiKey = await storage.getItem('binance_api_key');
  return !!apiKey;
}

/**
 * Delete Binance API keys from device
 */
export async function deleteBinanceKeys() {
  await storage.deleteItem('binance_api_key');
  await storage.deleteItem('binance_api_secret');
}

/**
 * Execute Bitcoin withdrawal to hardware wallet
 * This executes directly from the phone to Binance
 * Server never sees the API keys
 *
 * @param {string} address - Bitcoin withdrawal address
 * @param {number} amount - Amount in BTC to withdraw
 * @param {string} network - Network (default: BTC)
 * @returns {Promise<Object>} Withdrawal result
 */
export async function executeWithdrawal(address, amount, network = 'BTC') {
  const client = await getBinanceClient();

  try {
    const result = await client.withdraw({
      coin: 'BTC',
      network: network,
      address: address,
      amount: amount,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Withdrawal error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get account balances
 * @returns {Promise<Object>} Account info with balances
 */
export async function getAccountBalances() {
  const client = await getBinanceClient();

  try {
    const accountInfo = await client.accountInfo();
    return {
      success: true,
      data: accountInfo.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0),
    };
  } catch (error) {
    console.error('Error fetching balances:', error);
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
  const client = await getBinanceClient();

  try {
    const fees = await client.withdrawalFee({ coin: 'BTC' });
    return parseFloat(fees);
  } catch (error) {
    console.error('Error fetching withdrawal fee:', error);
    // Return a fallback fee if API call fails
    return 0.0005; // Typical BTC network fee
  }
}

/**
 * Execute market buy order for BTC
 * Buys BTC using a fixed fiat amount in the specified currency
 *
 * @param {number} fiatAmount - Amount in fiat currency to spend (e.g., 35)
 * @param {number} tradingFeePercent - Trading fee percentage (e.g., 0.1 for 0.1%, 0.2 for 0.2%)
 * @param {string} currency - Currency code (e.g., 'EUR', 'USD', 'GBP')
 * @returns {Promise<Object>} Order result with execution details
 */
export async function executeMarketBuy(fiatAmount, tradingFeePercent = 0.1, currency = 'EUR') {
  const client = await getBinanceClient();

  try {
    // Get the Binance trading pair for this currency
    const symbol = getBinancePair(currency);

    // Get current BTC price in the specified currency
    const ticker = await client.prices({ symbol });
    const currentPrice = parseFloat(ticker[symbol]);

    // Get symbol info to determine the correct precision for quantity
    const exchangeInfo = await client.exchangeInfo({ symbol });
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
    // Note: Trading fee is automatically deducted by Binance, we don't subtract it here
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

    // Execute market buy order with calculated quantity
    const order = await client.order({
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quantity: quantity.toFixed(precision),
    });

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

    // Convert trading fee from BTC to fiat
    const tradingFeeInFiat = totalFeesBtc * avgPrice;

    return {
      success: true,
      data: {
        orderId: order.orderId,
        btcAmount: totalBtc,
        fiatSpent: totalFiat,
        currency: currency,
        avgPrice: avgPrice,
        tradingFee: tradingFeeInFiat,
        timestamp: new Date(order.transactTime).toISOString(),
        fills: order.fills,
        // Keep eurSpent for backward compatibility with older mobile app versions
        eurSpent: totalFiat,
      },
    };
  } catch (error) {
    console.error('Market buy order error:', error);
    return {
      success: false,
      error: error.message || error.toString(),
    };
  }
}
