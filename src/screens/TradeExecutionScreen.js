import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { executeMarketBuy, getSelectedExchange, getExchangeInfo } from '../services/exchangeService';
import { dcaAPI, authAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { getBinancePair, getKrakenPair, getCurrencySymbol } from '../utils/currency';

export default function TradeExecutionScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { tradeData, anomalyData } = route.params || {};

  // If coming from anomaly alert without tradeData, use a default amount
  const defaultAmount = 100; // Default to 100 currency units
  const effectiveTradeData = tradeData || { fiatAmount: defaultAmount };

  const [loading, setLoading] = useState(false);
  const [btcPrice, setBtcPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [estimatedBtc, setEstimatedBtc] = useState(null);
  const [tradingFeePercent, setTradingFeePercent] = useState(0.1); // Default 0.1%
  const [currency, setCurrency] = useState(anomalyData?.currency || 'EUR');
  const [exchange, setExchange] = useState('binance');

  useEffect(() => {
    // Load trading fee and estimate purchase
    loadTradingFee();
  }, []);

  const loadTradingFee = async () => {
    try {
      const [response, selectedExchange] = await Promise.all([
        authAPI.getSettings(),
        getSelectedExchange(),
      ]);

      const userExchange = response.success ? (response.data.settings.exchange || selectedExchange) : selectedExchange;
      setExchange(userExchange);

      // Set default fee based on exchange
      const exchangeInfo = getExchangeInfo(userExchange);
      const defaultFee = exchangeInfo?.tradingFee || 0.1;

      if (response.success) {
        const fee = parseFloat(response.data.settings.exchangeTradingFee || defaultFee);
        const userCurrency = response.data.settings.currency || 'EUR';
        setTradingFeePercent(fee);
        setCurrency(userCurrency);
        // Estimate purchase with the loaded fee and currency
        await estimatePurchase(fee, userCurrency, userExchange);
      } else {
        // Use defaults
        await estimatePurchase(defaultFee, 'EUR', userExchange);
      }
    } catch (error) {
      console.error('Error loading trading fee:', error);
      // Use defaults - but still try to get selected exchange from local storage
      const fallbackExchange = await getSelectedExchange();
      setExchange(fallbackExchange);
      const exchangeInfo = getExchangeInfo(fallbackExchange);
      const defaultFee = exchangeInfo?.tradingFee || 0.1;
      await estimatePurchase(defaultFee, 'EUR', fallbackExchange);
    }
  };

  const estimatePurchase = async (feePercent, userCurrency = 'EUR', userExchange = 'binance') => {
    try {
      let currentPrice;

      if (userExchange === 'kraken') {
        // Fetch from Kraken
        const pair = getKrakenPair(userCurrency);
        const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`);
        const data = await response.json();
        if (data.result) {
          const tickerData = Object.values(data.result)[0];
          currentPrice = parseFloat(tickerData.a[0]); // Ask price
        }
      } else {
        // Fetch from Binance (default)
        const symbol = getBinancePair(userCurrency);
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await response.json();
        currentPrice = parseFloat(data.price);
      }

      setBtcPrice(currentPrice);

      // Get fiat amount from effectiveTradeData (supports both old eurAmount and new fiatAmount)
      const fiatAmount = effectiveTradeData.fiatAmount || effectiveTradeData.eurAmount;

      // Estimate BTC amount
      // Note: Trading fee is automatically deducted by the exchange, this is just an estimate
      const estimatedAmount = fiatAmount / currentPrice;
      setEstimatedBtc(estimatedAmount);
    } catch (error) {
      console.error('Error estimating purchase:', error);
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleExecute = async () => {
    const fiatAmount = effectiveTradeData.fiatAmount || effectiveTradeData.eurAmount;
    const currencySymbol = getCurrencySymbol(currency);
    const exchangeName = getExchangeInfo(exchange).name;

    Alert.alert(
      'Confirm DCA Purchase',
      `Execute market buy order on ${exchangeName} for ${currencySymbol}${fiatAmount} ${currency}?\n\nEstimated: ${estimatedBtc?.toFixed(8) || '~'} BTC`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute',
          style: 'default',
          onPress: executeTrade,
        },
      ]
    );
  };

  const executeTrade = async () => {
    setLoading(true);
    try {
      const fiatAmount = effectiveTradeData.fiatAmount || effectiveTradeData.eurAmount;
      const result = await executeMarketBuy(exchange, fiatAmount, tradingFeePercent, currency);

      if (result.success) {
        const currencySymbol = getCurrencySymbol(currency);

        // Report the trade execution to the server
        try {
          await dcaAPI.reportTradeExecution({
            orderId: result.data.orderId,
            btcAmount: result.data.btcAmount,
            fiatSpent: result.data.fiatSpent,
            currency: result.data.currency,
            avgPrice: result.data.avgPrice,
            tradingFee: result.data.tradingFee,
            timestamp: result.data.timestamp,
            exchange: exchange,
          });
        } catch (reportError) {
          console.error('Failed to report trade to server:', reportError);
          // Continue even if reporting fails - trade was successful
        }

        let message = `Trade executed successfully!\n\n` +
          `BTC Purchased: ${result.data.btcAmount.toFixed(8)}\n` +
          `${currency} Spent: ${currencySymbol}${result.data.fiatSpent.toFixed(2)}\n` +
          `Avg Price: ${currencySymbol}${result.data.avgPrice.toFixed(2)}`;

        if (result.warning) {
          message += `\n\n⚠️ ${result.warning}`;
        }

        Alert.alert(
          'Success',
          message,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Trade execution failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to execute trade');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Purchase',
      'Are you sure you want to skip this scheduled purchase?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>DCA Purchase</Text>
        <Text style={styles.subtitle}>
          {anomalyData ? 'Take advantage of this buying opportunity' : 'Execute your scheduled Bitcoin purchase'}
        </Text>

        {/* Anomaly Alert Opportunity Card */}
        {anomalyData && (
          <View style={styles.opportunityCard}>
            <View style={styles.opportunityHeader}>
              <Text style={styles.opportunityBadge}>🎯 BUYING OPPORTUNITY</Text>
            </View>

            <Text style={styles.opportunityTitle}>
              Bitcoin {anomalyData.priceChange > 0 ? 'Surged' : 'Dropped'} {Math.abs(anomalyData.priceChange).toFixed(1)}%
            </Text>

            <View style={styles.metricsContainer}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Success Rate</Text>
                <Text style={styles.metricValue}>{anomalyData.successRate}</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Expected Return</Text>
                <Text style={styles.metricValue}>+{anomalyData.expectedReturn.toFixed(1)}%</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Confidence</Text>
                <Text style={styles.metricValue}>{(anomalyData.confidence * 100).toFixed(0)}%</Text>
              </View>
            </View>

            <Text style={styles.opportunityNote}>
              Based on historical analysis of similar market conditions
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Exchange:</Text>
            <Text style={styles.infoValue}>{getExchangeInfo(exchange).name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{currency} Amount:</Text>
            <Text style={styles.infoValue}>
              {getCurrencySymbol(currency)}{(effectiveTradeData.fiatAmount || effectiveTradeData.eurAmount).toFixed(2)}
            </Text>
          </View>

          {loadingPrice ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current BTC Price:</Text>
                <Text style={styles.infoValue}>
                  {getCurrencySymbol(currency)}{btcPrice?.toFixed(2) || '-'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated BTC:</Text>
                <Text style={styles.infoValue}>{estimatedBtc?.toFixed(8) || '-'} BTC</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabelSmall}>Trading Fee ({tradingFeePercent}%):</Text>
                <Text style={styles.infoValueSmall}>
                  ~{getCurrencySymbol(currency)}{((effectiveTradeData.fiatAmount || effectiveTradeData.eurAmount) * (tradingFeePercent / 100)).toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            ⓘ The actual execution price and BTC amount will be determined by the market order at the time of execution.
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
              <Text style={styles.buttonText}>Execute Purchase</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.skipButton]}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.skipButtonText]}>Skip</Text>
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
  opportunityCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4caf50',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  opportunityHeader: {
    marginBottom: 12,
  },
  opportunityBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2e7d32',
    letterSpacing: 1,
  },
  opportunityTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  opportunityNote: {
    fontSize: 12,
    color: '#558b2f',
    fontStyle: 'italic',
    textAlign: 'center',
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
