// Supported currencies list
// Note: Kraken uses XBT instead of BTC, and some currencies are not supported
// Coinbase uses hyphenated pairs (BTC-USD)
export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro', binancePair: 'BTCEUR', krakenPair: 'XBTEUR', coinbasePair: 'BTC-EUR' },
  { code: 'USD', symbol: '$', name: 'US Dollar', binancePair: 'BTCUSDT', krakenPair: 'XBTUSD', coinbasePair: 'BTC-USD' },
  { code: 'GBP', symbol: '£', name: 'British Pound', binancePair: 'BTCGBP', krakenPair: 'XBTGBP', coinbasePair: 'BTC-GBP' },
  { code: 'USDT', symbol: '₮', name: 'Tether', binancePair: 'BTCUSDT', krakenPair: 'XBTUSDT', coinbasePair: 'BTC-USDT' },
  { code: 'USDC', symbol: 'USDC', name: 'USD Coin', binancePair: 'BTCUSDC', krakenPair: 'XBTUSDC', coinbasePair: 'BTC-USDC' },
  { code: 'BUSD', symbol: 'BUSD', name: 'Binance USD', binancePair: 'BTCBUSD', krakenPair: null, coinbasePair: null }, // Not on Kraken/Coinbase
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', binancePair: 'BTCAUD', krakenPair: 'XBTAUD', coinbasePair: 'BTC-AUD' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', binancePair: 'BTCBRL', krakenPair: null, coinbasePair: null }, // Not on Kraken/Coinbase
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', binancePair: 'BTCTRY', krakenPair: null, coinbasePair: null }, // Not on Kraken/Coinbase
  { code: 'TUSD', symbol: 'TUSD', name: 'TrueUSD', binancePair: 'BTCTUSD', krakenPair: null, coinbasePair: null }, // Not on Kraken/Coinbase
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', binancePair: null, krakenPair: 'XBTCAD', coinbasePair: 'BTC-CAD' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', binancePair: null, krakenPair: 'XBTCHF', coinbasePair: 'BTC-CHF' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', binancePair: null, krakenPair: 'XBTJPY', coinbasePair: null }, // Not on Coinbase
];

export const DEFAULT_CURRENCY = 'EUR';

// Get currency symbol for a given currency code
export function getCurrencySymbol(currencyCode) {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency ? currency.symbol : currencyCode;
}

// Get Binance trading pair for a given currency
export function getBinancePair(currencyCode) {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency?.binancePair || `BTC${currencyCode}`;
}

// Get Kraken trading pair for a given currency
export function getKrakenPair(currencyCode) {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency?.krakenPair || `XBT${currencyCode}`;
}

// Get Coinbase trading pair for a given currency
export function getCoinbasePair(currencyCode) {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency?.coinbasePair || `BTC-${currencyCode}`;
}

// Get currencies supported by a specific exchange
export function getCurrenciesForExchange(exchange) {
  if (exchange === 'kraken') {
    return SUPPORTED_CURRENCIES.filter(c => c.krakenPair !== null);
  }
  if (exchange === 'coinbase' || exchange === 'coinbase_advanced') {
    return SUPPORTED_CURRENCIES.filter(c => c.coinbasePair !== null);
  }
  return SUPPORTED_CURRENCIES.filter(c => c.binancePair !== null);
}

// Format amount with currency symbol and code
// Example: formatCurrency(100, 'EUR') => "€100.00 EUR"
export function formatCurrency(amount, currencyCode = DEFAULT_CURRENCY) {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = typeof amount === 'number'
    ? amount.toFixed(2)
    : parseFloat(amount).toFixed(2);

  return `${symbol}${formattedAmount} ${currencyCode}`;
}

// Format amount with just the currency symbol (no code)
// Example: formatCurrencyShort(100, 'EUR') => "€100.00"
export function formatCurrencyShort(amount, currencyCode = DEFAULT_CURRENCY) {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = typeof amount === 'number'
    ? amount.toFixed(2)
    : parseFloat(amount).toFixed(2);

  return `${symbol}${formattedAmount}`;
}

// Check if a currency code is valid
export function isValidCurrency(currencyCode) {
  return SUPPORTED_CURRENCIES.some(c => c.code === currencyCode);
}

// Get currency name for a given currency code
export function getCurrencyName(currencyCode) {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency ? currency.name : currencyCode;
}
