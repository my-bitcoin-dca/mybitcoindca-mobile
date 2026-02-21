// Supported currencies list
// Note: Kraken uses XBT instead of BTC, and some currencies are not supported
export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro', binancePair: 'BTCEUR', krakenPair: 'XBTEUR' },
  { code: 'USD', symbol: '$', name: 'US Dollar', binancePair: 'BTCUSDT', krakenPair: 'XBTUSD' },
  { code: 'GBP', symbol: '£', name: 'British Pound', binancePair: 'BTCGBP', krakenPair: 'XBTGBP' },
  { code: 'USDT', symbol: '₮', name: 'Tether', binancePair: 'BTCUSDT', krakenPair: 'XBTUSDT' },
  { code: 'USDC', symbol: 'USDC', name: 'USD Coin', binancePair: 'BTCUSDC', krakenPair: 'XBTUSDC' },
  { code: 'BUSD', symbol: 'BUSD', name: 'Binance USD', binancePair: 'BTCBUSD', krakenPair: null }, // Not on Kraken
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', binancePair: 'BTCAUD', krakenPair: 'XBTAUD' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', binancePair: 'BTCBRL', krakenPair: null }, // Not on Kraken
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', binancePair: 'BTCTRY', krakenPair: null }, // Not on Kraken
  { code: 'TUSD', symbol: 'TUSD', name: 'TrueUSD', binancePair: 'BTCTUSD', krakenPair: null }, // Not on Kraken
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', binancePair: null, krakenPair: 'XBTCAD' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', binancePair: null, krakenPair: 'XBTCHF' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', binancePair: null, krakenPair: 'XBTJPY' },
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

// Get currencies supported by a specific exchange
export function getCurrenciesForExchange(exchange) {
  if (exchange === 'kraken') {
    return SUPPORTED_CURRENCIES.filter(c => c.krakenPair !== null);
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
