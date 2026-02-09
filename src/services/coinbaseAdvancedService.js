import { ec as EC } from 'elliptic';
import CryptoJS from 'crypto-js';
import storage from '../utils/storage';
import { getCoinbasePair } from '../utils/currency';

const COINBASE_API_URL = 'https://api.coinbase.com';

// Initialize elliptic curve for ES256 (P-256)
const ec = new EC('p256');

/**
 * Get storage key with optional user namespace
 */
function getStorageKey(baseKey, userId) {
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Base64URL encode (JWT-safe base64)
 */
function base64UrlEncode(str) {
  // Convert string to WordArray if it's a string
  let wordArray;
  if (typeof str === 'string') {
    wordArray = CryptoJS.enc.Utf8.parse(str);
  } else {
    wordArray = str;
  }

  return CryptoJS.enc.Base64.stringify(wordArray)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert a hex string to Uint8Array
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64url
 */
function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Parse EC private key from PEM format
 */
function parseECPrivateKey(pemKey) {
  // Remove PEM headers and whitespace
  const base64 = pemKey
    .replace('-----BEGIN EC PRIVATE KEY-----', '')
    .replace('-----END EC PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  // Decode base64 to bytes
  const der = atob(base64);
  const bytes = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) {
    bytes[i] = der.charCodeAt(i);
  }

  // Parse ASN.1 DER structure for EC private key
  // SEC1 EC private key format:
  // SEQUENCE {
  //   INTEGER 1 (version)
  //   OCTET STRING (private key)
  //   [0] OID (curve - optional)
  //   [1] BIT STRING (public key - optional)
  // }

  // Find the private key bytes (32 bytes for P-256)
  // The private key is in an OCTET STRING after the version INTEGER
  let idx = 0;

  // Skip SEQUENCE tag and length
  if (bytes[idx] !== 0x30) throw new Error('Invalid EC key format');
  idx++;
  if (bytes[idx] & 0x80) {
    idx += (bytes[idx] & 0x7f) + 1;
  } else {
    idx++;
  }

  // Skip version INTEGER (should be 1)
  if (bytes[idx] !== 0x02) throw new Error('Invalid EC key format');
  idx++;
  const versionLen = bytes[idx];
  idx += 1 + versionLen;

  // Read OCTET STRING containing private key
  if (bytes[idx] !== 0x04) throw new Error('Invalid EC key format');
  idx++;
  const keyLen = bytes[idx];
  idx++;

  // Extract private key bytes
  const privateKeyBytes = bytes.slice(idx, idx + keyLen);

  // Convert to hex string
  let privateKeyHex = '';
  for (let i = 0; i < privateKeyBytes.length; i++) {
    privateKeyHex += privateKeyBytes[i].toString(16).padStart(2, '0');
  }

  return privateKeyHex;
}

/**
 * Generate a random nonce
 */
function generateNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 16; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

/**
 * Generate a JWT token for Coinbase CDP API authentication
 */
function generateJWT(method, requestPath, keyName, privateKeyPem) {
  const uri = `${method} api.coinbase.com${requestPath}`;

  // Clean up the private key (handle escaped newlines)
  const cleanPem = privateKeyPem.replace(/\\n/g, '\n');

  // Parse the EC private key
  const privateKeyHex = parseECPrivateKey(cleanPem);

  // Create key pair from private key
  const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');

  const now = Math.floor(Date.now() / 1000);

  // JWT Header
  const header = {
    alg: 'ES256',
    kid: keyName,
    nonce: generateNonce(),
    typ: 'JWT'
  };

  // JWT Payload
  const payload = {
    sub: keyName,
    iss: 'cdp',
    aud: ['cdp_service'],
    nbf: now,
    exp: now + 120,
    uris: [uri],
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create signature input
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Hash the signature input with SHA-256
  const hash = CryptoJS.SHA256(signatureInput);
  const hashHex = hash.toString(CryptoJS.enc.Hex);

  // Sign the hash
  const signature = keyPair.sign(hashHex, 'hex', { canonical: true });

  // Convert signature to fixed-length format (64 bytes for ES256)
  const r = signature.r.toArray('be', 32);
  const s = signature.s.toArray('be', 32);

  // Concatenate r and s
  const sigBytes = new Uint8Array(64);
  sigBytes.set(r, 0);
  sigBytes.set(s, 32);

  // Encode signature
  const encodedSignature = bytesToBase64Url(sigBytes);

  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Make an authenticated request to Coinbase CDP API
 */
async function coinbaseRequest(endpoint, method = 'GET', body = null, userId) {
  const keyName = await storage.getItem(getStorageKey('coinbase_advanced_api_key', userId));
  const privateKey = await storage.getItem(getStorageKey('coinbase_advanced_api_secret', userId));

  if (!keyName || !privateKey) {
    throw new Error('Coinbase API keys not found. Please configure them first.');
  }

  const jwt = generateJWT(method, endpoint, keyName, privateKey);

  const headers = {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  };

  const options = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${COINBASE_API_URL}${endpoint}`, options);

  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Coinbase API returned non-JSON response:', text.substring(0, 200));
    throw new Error(`Coinbase API error: ${response.status} - received non-JSON response. Please try again.`);
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.message || data.error || `Coinbase error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Store Coinbase CDP API keys securely on device
 */
export async function storeCoinbaseAdvancedKeys(keyName, privateKey, userId) {
  await storage.setItem(getStorageKey('coinbase_advanced_api_key', userId), keyName);
  await storage.setItem(getStorageKey('coinbase_advanced_api_secret', userId), privateKey);
}

/**
 * Check if Coinbase Advanced API keys are stored
 */
export async function hasCoinbaseAdvancedKeys(userId) {
  const keyName = await storage.getItem(getStorageKey('coinbase_advanced_api_key', userId));
  return !!keyName;
}

/**
 * Delete Coinbase Advanced API keys from device
 */
export async function deleteCoinbaseAdvancedKeys(userId) {
  await storage.deleteItem(getStorageKey('coinbase_advanced_api_key', userId));
  await storage.deleteItem(getStorageKey('coinbase_advanced_api_secret', userId));
}

/**
 * Get account balances from Coinbase Advanced
 */
export async function getAccountBalances(userId) {
  try {
    const response = await coinbaseRequest('/api/v3/brokerage/accounts', 'GET', null, userId);

    const balances = response.accounts
      .filter(account => parseFloat(account.available_balance.value) > 0 || parseFloat(account.hold.value) > 0)
      .map(account => ({
        asset: account.currency,
        free: account.available_balance.value,
        locked: account.hold.value,
      }));

    return {
      success: true,
      data: balances,
    };
  } catch (error) {
    const errorMsg = error.message || error.toString();
    if (errorMsg.includes('JSON') || errorMsg.includes('unexpected character') || errorMsg.includes('Unexpected token')) {
      return {
        success: false,
        error: 'Coinbase API is temporarily unavailable. Please try again in a few minutes.',
      };
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Get withdrawal fee for BTC
 */
export async function getWithdrawalFee(userId) {
  return 0.0001;
}

/**
 * Execute Bitcoin withdrawal to hardware wallet
 */
export async function executeWithdrawal(address, amount, network = 'bitcoin', userId) {
  try {
    const accountsResponse = await coinbaseRequest('/api/v3/brokerage/accounts', 'GET', null, userId);
    const btcAccount = accountsResponse.accounts.find(a => a.currency === 'BTC');

    if (!btcAccount) {
      throw new Error('BTC account not found on Coinbase');
    }

    const withdrawalBody = {
      amount: amount.toString(),
      currency: 'BTC',
      crypto_address: {
        address: address,
        network: network,
      },
    };

    const result = await coinbaseRequest(
      '/api/v3/brokerage/withdrawals/crypto',
      'POST',
      withdrawalBody,
      userId
    );

    return {
      success: true,
      data: {
        id: result.id || result.withdrawal_id,
        ...result,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || error.toString(),
    };
  }
}

/**
 * Execute market buy order for BTC
 */
export async function executeMarketBuy(fiatAmount, tradingFeePercent = 0.6, currency = 'USD', userId) {
  try {
    const productId = getCoinbasePair(currency);

    if (!productId) {
      return {
        success: false,
        error: `Currency ${currency} is not supported on Coinbase`,
      };
    }

    const orderBody = {
      client_order_id: `dca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product_id: productId,
      side: 'BUY',
      order_configuration: {
        market_market_ioc: {
          quote_size: fiatAmount.toFixed(2),
        },
      },
    };

    const orderResponse = await coinbaseRequest(
      '/api/v3/brokerage/orders',
      'POST',
      orderBody,
      userId
    );

    const orderId = orderResponse.order_id || orderResponse.success_response?.order_id;

    if (!orderId) {
      throw new Error('Order placed but no order ID returned');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const orderDetails = await coinbaseRequest(
      `/api/v3/brokerage/orders/historical/${orderId}`,
      'GET',
      null,
      userId
    );

    const order = orderDetails.order;

    const filledSize = parseFloat(order.filled_size || '0');
    const totalValueFiat = parseFloat(order.total_value_after_fees || order.filled_value || '0');
    const avgPrice = filledSize > 0 ? totalValueFiat / filledSize : 0;
    const totalFees = parseFloat(order.total_fees || '0');
    const tradingFeeBtc = avgPrice > 0 ? totalFees / avgPrice : 0;

    return {
      success: true,
      data: {
        orderId: orderId,
        btcAmount: filledSize,
        fiatSpent: totalValueFiat,
        currency: currency,
        avgPrice: avgPrice,
        tradingFee: totalFees,
        tradingFeeBtc: tradingFeeBtc,
        timestamp: order.created_time || new Date().toISOString(),
        eurSpent: totalValueFiat,
      },
    };
  } catch (error) {
    const errorMsg = error.message || error.toString();
    if (errorMsg.includes('JSON') || errorMsg.includes('unexpected character') || errorMsg.includes('Unexpected token')) {
      return {
        success: false,
        error: 'Coinbase API is temporarily unavailable. Please try again in a few minutes.',
      };
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
}
