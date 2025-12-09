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
import { executeMarketBuy } from '../services/binanceService';
import { dcaAPI, authAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function TradeExecutionScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { tradeData } = route.params;
  const [loading, setLoading] = useState(false);
  const [btcPrice, setBtcPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [estimatedBtc, setEstimatedBtc] = useState(null);
  const [tradingFeePercent, setTradingFeePercent] = useState(0.1); // Default 0.1%

  useEffect(() => {
    // Load trading fee and estimate purchase
    loadTradingFee();
  }, []);

  const loadTradingFee = async () => {
    try {
      const response = await authAPI.getSettings();
      if (response.success) {
        const fee = parseFloat(response.data.settings.exchangeTradingFee || 0.1);
        setTradingFeePercent(fee);
        // Estimate purchase with the loaded fee
        await estimatePurchase(fee);
      } else {
        // Use default fee
        await estimatePurchase(0.1);
      }
    } catch (error) {
      console.error('Error loading trading fee:', error);
      // Use default fee
      await estimatePurchase(0.1);
    }
  };

  const estimatePurchase = async (feePercent) => {
    try {
      // Fetch current BTC/EUR price from Binance for estimation
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCEUR');
      const data = await response.json();
      const currentPrice = parseFloat(data.price);

      setBtcPrice(currentPrice);

      // Estimate BTC amount
      // Note: Trading fee is automatically deducted by Binance, this is just an estimate
      const estimatedAmount = tradeData.eurAmount / currentPrice;
      setEstimatedBtc(estimatedAmount);
    } catch (error) {
      console.error('Error estimating purchase:', error);
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleExecute = async () => {
    Alert.alert(
      'Confirm DCA Purchase',
      `Execute market buy order for €${tradeData.eurAmount}?\n\nEstimated: ${estimatedBtc?.toFixed(8) || '~'} BTC`,
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
      const result = await executeMarketBuy(tradeData.eurAmount, tradingFeePercent);

      if (result.success) {
        // Report the trade execution to the server
        try {
          await dcaAPI.reportTradeExecution({
            orderId: result.data.orderId,
            btcAmount: result.data.btcAmount,
            eurSpent: result.data.eurSpent,
            avgPrice: result.data.avgPrice,
            tradingFee: result.data.tradingFee,
            timestamp: result.data.timestamp,
          });
        } catch (reportError) {
          console.error('Failed to report trade to server:', reportError);
          // Continue even if reporting fails - trade was successful
        }

        Alert.alert(
          'Success',
          `Trade executed successfully!\n\n` +
          `BTC Purchased: ${result.data.btcAmount.toFixed(8)}\n` +
          `EUR Spent: €${result.data.eurSpent.toFixed(2)}\n` +
          `Avg Price: €${result.data.avgPrice.toFixed(2)}`,
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
        <Text style={styles.subtitle}>Execute your scheduled Bitcoin purchase</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>EUR Amount:</Text>
            <Text style={styles.infoValue}>€{tradeData.eurAmount.toFixed(2)}</Text>
          </View>

          {loadingPrice ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current BTC Price:</Text>
                <Text style={styles.infoValue}>€{btcPrice?.toFixed(2) || '-'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated BTC:</Text>
                <Text style={styles.infoValue}>{estimatedBtc?.toFixed(8) || '-'} BTC</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabelSmall}>Trading Fee ({tradingFeePercent}%):</Text>
                <Text style={styles.infoValueSmall}>~€{(tradeData.eurAmount * (tradingFeePercent / 100)).toFixed(2)}</Text>
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
