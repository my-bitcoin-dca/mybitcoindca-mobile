/**
 * Application Constants
 * Centralized location for magic numbers, default values, and configuration
 */

// Default DCA Settings
export const DCA_DEFAULTS = {
  WEEKLY_AMOUNT: 35,
  FREQUENCY: 'weekly',
  DAY_OF_WEEK: 'thursday',
  HOUR: 8,
  CURRENCY: 'EUR',
};

// Exchange Configuration
export const EXCHANGE_DEFAULTS = {
  BINANCE_TRADING_FEE: 0.1, // 0.1% default
  KRAKEN_TRADING_FEE: 0.26, // 0.26% taker fee
  DEFAULT_WITHDRAWAL_FEE: 0.0005, // Typical BTC network fee fallback
};

// API Configuration
export const API_CONFIG = {
  TIMEOUT_MS: 10000,
  ORDER_QUERY_DELAY_MS: 1000, // Delay before querying order details
};

// Validation
export const VALIDATION = {
  PASSCODE_LENGTH: 6,
  MIN_PASSWORD_LENGTH: 12,
  TWO_FA_CODE_LENGTH: 6,
};

// Notification Channels (Android)
export const NOTIFICATION_CHANNEL = {
  NAME: 'default',
  VIBRATION_PATTERN: [0, 250, 250, 250],
  LIGHT_COLOR: '#FF231F7C',
};

// Pagination
export const PAGINATION = {
  NAVIGATION_TRANSITION_DELAY_MS: 1000,
};

// Styling Constants
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 24,
};

export const FONT_SIZES = {
  XS: 11,
  SM: 12,
  MD: 14,
  LG: 16,
  XL: 18,
  XXL: 20,
  TITLE: 24,
  HEADER: 28,
};

export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
};
