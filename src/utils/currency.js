// Supported currencies list
export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro', binancePair: 'BTCEUR' },
  { code: 'USD', symbol: '$', name: 'US Dollar', binancePair: 'BTCUSDT' },
  { code: 'GBP', symbol: '£', name: 'British Pound', binancePair: 'BTCGBP' },
  { code: 'USDT', symbol: '₮', name: 'Tether', binancePair: 'BTCUSDT' },
  { code: 'USDC', symbol: 'USDC', name: 'USD Coin', binancePair: 'BTCUSDC' },
  { code: 'BUSD', symbol: 'BUSD', name: 'Binance USD', binancePair: 'BTCBUSD' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', binancePair: 'BTCAUD' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', binancePair: 'BTCBRL' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', binancePair: 'BTCTRY' },
  { code: 'TUSD', symbol: 'TUSD', name: 'TrueUSD', binancePair: 'BTCTUSD' }
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
  return currency ? currency.binancePair : `BTC${currencyCode}`;
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
