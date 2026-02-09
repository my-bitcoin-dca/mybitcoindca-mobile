/**
 * Coinbase OAuth Service
 * Handles OAuth-based authentication and trading for retail Coinbase accounts
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import storage from '../utils/storage';
import { getCoinbasePair } from '../utils/currency';

// Complete auth session if returning from OAuth
WebBrowser.maybeCompleteAuthSession();

// Coinbase OAuth Configuration
const COINBASE_CLIENT_ID = 'JqANMMfXeeW0SimxvWTHWok1dKrJFifl';
const COINBASE_OAUTH_SCOPES = [
  'wallet:accounts:read',
  'wallet:buys:create',
  'wallet:buys:read',
  'wallet:transactions:send',
  'wallet:transactions:read',
  'wallet:user:read',
  'wallet:payment-methods:read',
];

// Storage keys
const ACCESS_TOKEN_KEY = 'coinbase_oauth_access_token';
const REFRESH_TOKEN_KEY = 'coinbase_oauth_refresh_token';
const TOKEN_EXPIRY_KEY = 'coinbase_oauth_token_expiry';

/**
 * Get storage key with optional user namespace
 */
function getStorageKey(baseKey, userId) {
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Get the redirect URI for OAuth
 */
function getRedirectUri() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'mybitcoindca',
    path: 'oauth/coinbase',
  });
  console.log('Coinbase OAuth redirect URI:', redirectUri);
  return redirectUri;
}

/**
 * Initiate Coinbase OAuth flow
 * @param {string} userId - User ID for namespaced storage
 * @returns {Promise<Object>} Result with success status
 */
export async function initiateCoinbaseOAuth(userId) {
  try {
    const redirectUri = getRedirectUri();

    const discovery = {
      authorizationEndpoint: 'https://www.coinbase.com/oauth/authorize',
      tokenEndpoint: 'https://api.coinbase.com/oauth/token',
    };

    const request = new AuthSession.AuthRequest({
      clientId: COINBASE_CLIENT_ID,
      scopes: COINBASE_OAUTH_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.params.code) {
      // Exchange authorization code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: COINBASE_CLIENT_ID,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        },
        discovery
      );

      // Store tokens
      await storeTokens(tokenResult, userId);

      return { success: true };
    } else if (result.type === 'cancel') {
      return { success: false, error: 'OAuth flow was cancelled' };
    } else {
      return { success: false, error: 'OAuth flow failed' };
    }
  } catch (error) {
    console.error('Coinbase OAuth error:', error);
    return { success: false, error: error.message || 'OAuth flow failed' };
  }
}

/**
 * Store OAuth tokens securely
 */
async function storeTokens(tokenResult, userId) {
  await storage.setItem(
    getStorageKey(ACCESS_TOKEN_KEY, userId),
    tokenResult.accessToken
  );

  if (tokenResult.refreshToken) {
    await storage.setItem(
      getStorageKey(REFRESH_TOKEN_KEY, userId),
      tokenResult.refreshToken
    );
  }

  // Calculate expiry time (subtract 60 seconds buffer)
  const expiresIn = tokenResult.expiresIn || 7200; // Default 2 hours
  const expiry = Date.now() + (expiresIn - 60) * 1000;
  await storage.setItem(
    getStorageKey(TOKEN_EXPIRY_KEY, userId),
    expiry.toString()
  );
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken(userId) {
  const refreshToken = await storage.getItem(getStorageKey(REFRESH_TOKEN_KEY, userId));

  if (!refreshToken) {
    throw new Error('No refresh token available. Please reconnect your Coinbase account.');
  }

  const discovery = {
    tokenEndpoint: 'https://api.coinbase.com/oauth/token',
  };

  try {
    const tokenResult = await AuthSession.refreshAsync(
      {
        clientId: COINBASE_CLIENT_ID,
        refreshToken,
      },
      discovery
    );

    await storeTokens(tokenResult, userId);
    return tokenResult.accessToken;
  } catch (error) {
    // If refresh fails, clear tokens and require re-authentication
    await deleteCoinbaseKeys(userId);
    throw new Error('Session expired. Please reconnect your Coinbase account.');
  }
}

/**
 * Get a valid access token (refreshing if needed)
 */
async function getAccessToken(userId) {
  const expiry = await storage.getItem(getStorageKey(TOKEN_EXPIRY_KEY, userId));
  const accessToken = await storage.getItem(getStorageKey(ACCESS_TOKEN_KEY, userId));

  if (!accessToken) {
    throw new Error('Not connected to Coinbase. Please connect your account first.');
  }

  // Check if token is expired or about to expire
  if (expiry && Date.now() > parseInt(expiry)) {
    return await refreshAccessToken(userId);
  }

  return accessToken;
}

/**
 * Make an authenticated request to Coinbase API
 */
async function coinbaseRequest(endpoint, method = 'GET', body = null, userId) {
  const accessToken = await getAccessToken(userId);

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'CB-VERSION': '2024-01-01',
  };

  const options = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`https://api.coinbase.com${endpoint}`, options);

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Coinbase API returned non-JSON response:', text.substring(0, 200));
    throw new Error(`Coinbase API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    throw new Error(data.errors[0].message || 'Coinbase API error');
  }

  if (!response.ok) {
    throw new Error(data.message || `Coinbase error: ${response.status}`);
  }

  return data;
}

/**
 * Check if Coinbase OAuth tokens are stored
 */
export async function hasCoinbaseKeys(userId) {
  const accessToken = await storage.getItem(getStorageKey(ACCESS_TOKEN_KEY, userId));
  return !!accessToken;
}

/**
 * Delete Coinbase OAuth tokens
 */
export async function deleteCoinbaseKeys(userId) {
  await storage.deleteItem(getStorageKey(ACCESS_TOKEN_KEY, userId));
  await storage.deleteItem(getStorageKey(REFRESH_TOKEN_KEY, userId));
  await storage.deleteItem(getStorageKey(TOKEN_EXPIRY_KEY, userId));
}

/**
 * Get account balances from Coinbase
 */
export async function getAccountBalances(userId) {
  try {
    const response = await coinbaseRequest('/v2/accounts', 'GET', null, userId);

    const balances = response.data
      .filter(account => parseFloat(account.balance.amount) > 0)
      .map(account => ({
        asset: account.currency.code,
        free: account.balance.amount,
        locked: '0',
      }));

    return {
      success: true,
      data: balances,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch balances',
    };
  }
}

/**
 * Get withdrawal fee estimate
 * Coinbase retail typically covers network fees
 */
export async function getWithdrawalFee(userId) {
  // Coinbase retail often covers network fees, return minimal estimate
  return 0.0001;
}

/**
 * Execute Bitcoin withdrawal (send)
 */
export async function executeWithdrawal(address, amount, network = 'bitcoin', userId) {
  try {
    // Get BTC account
    const accountsResponse = await coinbaseRequest('/v2/accounts', 'GET', null, userId);
    const btcAccount = accountsResponse.data.find(a => a.currency.code === 'BTC');

    if (!btcAccount) {
      throw new Error('BTC account not found on Coinbase');
    }

    // Create send transaction
    const sendBody = {
      type: 'send',
      to: address,
      amount: amount.toString(),
      currency: 'BTC',
      description: 'DCA withdrawal to hardware wallet',
    };

    const result = await coinbaseRequest(
      `/v2/accounts/${btcAccount.id}/transactions`,
      'POST',
      sendBody,
      userId
    );

    return {
      success: true,
      data: {
        id: result.data.id,
        status: result.data.status,
        ...result.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Withdrawal failed',
    };
  }
}

/**
 * Execute market buy order for BTC
 */
export async function executeMarketBuy(fiatAmount, tradingFeePercent = 1.49, currency = 'USD', userId) {
  try {
    // Get BTC account
    const accountsResponse = await coinbaseRequest('/v2/accounts', 'GET', null, userId);
    const btcAccount = accountsResponse.data.find(a => a.currency.code === 'BTC');

    if (!btcAccount) {
      throw new Error('BTC account not found on Coinbase');
    }

    // Get payment methods
    const paymentMethodsResponse = await coinbaseRequest('/v2/payment-methods', 'GET', null, userId);
    const primaryMethod = paymentMethodsResponse.data.find(pm => pm.primary_buy)
      || paymentMethodsResponse.data[0];

    if (!primaryMethod) {
      throw new Error('No payment method available. Please add a payment method in Coinbase.');
    }

    // Create buy order
    const buyBody = {
      amount: fiatAmount.toString(),
      currency: currency,
      payment_method: primaryMethod.id,
      commit: true,
    };

    const buyResult = await coinbaseRequest(
      `/v2/accounts/${btcAccount.id}/buys`,
      'POST',
      buyBody,
      userId
    );

    const buy = buyResult.data;

    // Calculate details
    const btcAmount = parseFloat(buy.amount.amount);
    const totalFiat = parseFloat(buy.total.amount);
    const feeAmount = parseFloat(buy.fee?.amount || '0');
    const avgPrice = btcAmount > 0 ? totalFiat / btcAmount : 0;
    const tradingFeeBtc = avgPrice > 0 ? feeAmount / avgPrice : 0;

    return {
      success: true,
      data: {
        orderId: buy.id,
        btcAmount: btcAmount,
        fiatSpent: totalFiat,
        currency: currency,
        avgPrice: avgPrice,
        tradingFee: feeAmount,
        tradingFeeBtc: tradingFeeBtc,
        timestamp: buy.created_at || new Date().toISOString(),
        // Keep eurSpent for backward compatibility
        eurSpent: totalFiat,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Purchase failed',
    };
  }
}
