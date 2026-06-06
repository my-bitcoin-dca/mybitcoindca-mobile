import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { executeMarketBuy, getSelectedExchange, getExchangeInfo } from '../services/exchangeService';
import { dcaAPI, authAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getBinancePair, getKrakenPair, getCurrencySymbol } from '../utils/currency';

const MIN_FIAT_AMOUNT = 10;

export default function LumpSumTradeScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?._id;

  const [loading, setLoading] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [btcPrice, setBtcPrice] = useState(null);
  const [estimatedBtc, setEstimatedBtc] = useState(null);
  const [tradingFeePercent, setTradingFeePercent] = useState(0.1);
  const [currency, setCurrency] = useState('EUR');
  const [exchange, setExchange] = useState('binance');
  const [amountInput, setAmountInput] = useState('');
  const [fiatAmount, setFiatAmount] = useState(0);

  useEffect(() => {
    loadDefaults();
  }, []);

  const loadDefaults = async () => {
    try {
      const [settingsRes, selectedExchange] = await Promise.all([
        authAPI.getSettings(),
        getSelectedExchange(userId),
      ]);

      const userExchange = settingsRes.success
        ? (settingsRes.data.settings.exchange || selectedExchange)
        : selectedExchange;
      setExchange(userExchange);

      const exchangeInfo = getExchangeInfo(userExchange);
      setTradingFeePercent(exchangeInfo?.tradingFee || 0.1);

      const userCurrency = settingsRes.success
        ? (settingsRes.data.settings.currency || 'EUR')
        : 'EUR';
      setCurrency(userCurrency);

      await fetchPrice(userCurrency, userExchange);
    } catch (error) {
      await fetchPrice('EUR', 'binance');
    }
  };

  const fetchPrice = async (userCurrency, userExchange) => {
    try {
      let currentPrice;
      if (userExchange === 'kraken') {
        const pair = getKrakenPair(userCurrency);
        const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`);
        const data = await res.json();
        if (data.result) {
          const tickerData = Object.values(data.result)[0];
          currentPrice = parseFloat(tickerData.a[0]);
        }
      } else {
        const symbol = getBinancePair(userCurrency);
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await res.json();
        currentPrice = parseFloat(data.price);
      }
      setBtcPrice(currentPrice);
    } catch (error) {
      // leave price null; UI shows '-'
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleAmountChange = (text) => {
    const filtered = text.replace(/[^0-9.]/g, '');
    setAmountInput(filtered);

    const parsed = parseFloat(filtered);
    if (!isNaN(parsed) && parsed > 0) {
      setFiatAmount(parsed);
      if (btcPrice) {
        setEstimatedBtc(parsed / btcPrice);
      }
    } else {
      setFiatAmount(0);
      setEstimatedBtc(null);
    }
  };

  const handleExecute = () => {
    if (!fiatAmount || fiatAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    if (fiatAmount < MIN_FIAT_AMOUNT) {
      Alert.alert(
        'Amount Too Low',
        `Minimum lump-sum trade is ${getCurrencySymbol(currency)}${MIN_FIAT_AMOUNT} ${currency}.`
      );
      return;
    }

    const currencySymbol = getCurrencySymbol(currency);
    const exchangeName = getExchangeInfo(exchange).name;

    Alert.alert(
      'Confirm Lump-Sum Buy',
      `Execute a one-off market buy on ${exchangeName} for ${currencySymbol}${fiatAmount.toFixed(2)} ${currency}?\n\nEstimated: ${estimatedBtc?.toFixed(8) || '~'} BTC\n\nThis is a one-time purchase and is separate from your scheduled DCA.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy', style: 'default', onPress: executeTrade },
      ]
    );
  };

  const executeTrade = async () => {
    setLoading(true);
    try {
      const result = await executeMarketBuy(exchange, fiatAmount, tradingFeePercent, currency, userId);

      if (!result.success) {
        Alert.alert('Trade Failed', result.error || 'Trade execution failed.');
        return;
      }

      try {
        await dcaAPI.reportTradeExecution({
          orderId: result.data.orderId,
          btcAmount: result.data.btcAmount,
          fiatSpent: result.data.fiatSpent,
          currency: result.data.currency,
          avgPrice: result.data.avgPrice,
          tradingFee: result.data.tradingFee,
          tradingFeeBtc: result.data.tradingFeeBtc,
          timestamp: result.data.timestamp,
          exchange,
          purchaseType: 'lump_sum',
        });
      } catch (reportError) {
        // Trade succeeded on the exchange; reporting can be reconciled later.
      }

      const currencySymbol = getCurrencySymbol(currency);
      Alert.alert(
        'Success',
        `Lump-sum buy executed.\n\n` +
          `BTC Purchased: ${result.data.btcAmount.toFixed(8)}\n` +
          `${currency} Spent: ${currencySymbol}${result.data.fiatSpent.toFixed(2)}\n` +
          `Avg Price: ${currencySymbol}${result.data.avgPrice.toFixed(2)}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to execute trade.');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);
  const currencySymbol = getCurrencySymbol(currency);
  const belowMin = fiatAmount > 0 && fiatAmount < MIN_FIAT_AMOUNT;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Lump-Sum Buy</Text>
        <Text style={styles.subtitle}>
          Execute a one-off Bitcoin purchase, separate from your scheduled DCA.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Exchange:</Text>
            <Text style={styles.infoValue}>{getExchangeInfo(exchange).name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{currency} Amount:</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
              <TextInput
                style={styles.amountInput}
                value={amountInput}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
                placeholder="100"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {loadingPrice ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current BTC Price:</Text>
                <Text style={styles.infoValue}>
                  {currencySymbol}{btcPrice?.toFixed(2) || '-'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated BTC:</Text>
                <Text style={styles.infoValue}>{estimatedBtc?.toFixed(8) || '-'} BTC</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabelSmall}>Trading Fee ({tradingFeePercent}%):</Text>
                <Text style={styles.infoValueSmall}>
                  ~{currencySymbol}{(fiatAmount * (tradingFeePercent / 100)).toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        {belowMin && (
          <View style={[styles.note, styles.warnNote]}>
            <Text style={[styles.noteText, styles.warnNoteText]}>
              Minimum lump-sum trade is {currencySymbol}{MIN_FIAT_AMOUNT} {currency}.
            </Text>
          </View>
        )}

        <View style={styles.note}>
          <Text style={styles.noteText}>
            ⓘ The actual execution price and BTC amount will be determined by the market order at the time of execution. This purchase will appear in your DCA stats.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.executeButton, loading && styles.buttonDisabled]}
            onPress={handleExecute}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.cardBackground} />
            ) : (
              <Text style={styles.buttonText}>Execute Lump-Sum Buy</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.skipButton]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.skipButtonText]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 18,
    color: colors.text,
    fontWeight: 'bold',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 18,
    color: colors.text,
    fontWeight: 'bold',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 18,
    color: colors.text,
    fontWeight: 'bold',
    minWidth: 80,
    paddingVertical: 8,
    textAlign: 'right',
  },
  infoLabelSmall: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  infoValueSmall: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  loader: {
    marginVertical: 20,
  },
  note: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  noteText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  warnNote: {
    backgroundColor: '#fff3e0',
  },
  warnNoteText: {
    color: '#e65100',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  executeButton: {
    backgroundColor: colors.success,
  },
  skipButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.cardBackground,
  },
  skipButtonText: {
    color: colors.textSecondary,
  },
});

LumpSumTradeScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};
