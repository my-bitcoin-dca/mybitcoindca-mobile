import Binance from 'binance-api-react-native';
import storage from '../utils/storage';

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
 * Execute market buy order for BTC/EUR
 * Buys BTC using a fixed EUR amount
 *
 * @param {number} eurAmount - Amount in EUR to spend (e.g., 35)
 * @param {number} tradingFeePercent - Trading fee percentage (e.g., 0.1 for 0.1%, 0.2 for 0.2%)
 * @returns {Promise<Object>} Order result with execution details
 */
export async function executeMarketBuy(eurAmount, tradingFeePercent = 0.1) {
  const client = await getBinanceClient();

  try {
    // Get current BTC/EUR price using the client
    const ticker = await client.prices({ symbol: 'BTCEUR' });
    const currentPrice = parseFloat(ticker.BTCEUR);

    // Get symbol info to determine the correct precision for quantity
    const exchangeInfo = await client.exchangeInfo({ symbol: 'BTCEUR' });
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === 'BTCEUR');

    // Find LOT_SIZE filter to get step size (quantity precision)
    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    const stepSize = parseFloat(lotSizeFilter.stepSize);

    // Calculate precision from step size (e.g., 0.00001 = 5 decimals)
    const precision = Math.abs(Math.log10(stepSize));

    // Calculate BTC quantity to buy
    // Note: Trading fee is automatically deducted by Binance, we don't subtract it here
    const rawQuantity = eurAmount / currentPrice;

    // Round down to the correct precision
    const quantity = Math.floor(rawQuantity * Math.pow(10, precision)) / Math.pow(10, precision);

    // Execute market buy order with calculated quantity
    const order = await client.order({
      symbol: 'BTCEUR',
      side: 'BUY',
      type: 'MARKET',
      quantity: quantity.toFixed(precision),
    });

    // Calculate actual execution details from fills
    let totalBtc = 0;
    let totalEur = 0;
    let totalFees = 0;

    if (order.fills && order.fills.length > 0) {
      order.fills.forEach(fill => {
        totalBtc += parseFloat(fill.qty);
        totalEur += parseFloat(fill.price) * parseFloat(fill.qty);
        totalFees += parseFloat(fill.commission); // Commission in BTC
      });
    } else {
      // Fallback to order-level data if fills not available
      totalBtc = parseFloat(order.executedQty);
      totalEur = parseFloat(order.cummulativeQuoteQty);
    }

    // Calculate average execution price
    const avgPrice = totalEur / totalBtc;

    return {
      success: true,
      data: {
        orderId: order.orderId,
        btcAmount: totalBtc,
        eurSpent: totalEur,
        avgPrice: avgPrice,
        tradingFee: totalFees,
        timestamp: new Date(order.transactTime).toISOString(),
        fills: order.fills,
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
