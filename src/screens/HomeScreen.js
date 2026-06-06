import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { hasExchangeKeys, getSelectedExchange } from '../services/exchangeService';
import { useFocusEffect } from '@react-navigation/native';
import { dcaAPI, surveyAPI, authAPI } from '../services/api';
import SurveyModal from '../components/SurveyModal';

const getCurrencySymbol = (currencyCode) => {
  const symbols = {
    'EUR': '\u20ac', 'USD': '$', 'GBP': '\u00a3', 'AUD': 'A$', 'BRL': 'R$', 'TRY': '\u20ba',
  };
  return symbols[currencyCode] || currencyCode;
};

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [hasKeys, setHasKeys] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [pendingTrade, setPendingTrade] = useState(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(null);
  const surveyChecked = useRef(false);

  useEffect(() => {
    checkSetup();
    checkSubscription();
    checkSurvey();
    checkPendingTrade();
    checkPendingWithdrawal();
  }, []);

  const checkSurvey = async () => {
    // Only check once per session
    if (surveyChecked.current) return;
    surveyChecked.current = true;

    try {
      const response = await surveyAPI.shouldShow();
      if (response.success && response.showSurvey) {
        // Show survey after a short delay to let the screen load
        setTimeout(() => {
          setShowSurvey(true);
        }, 2000);
      }
    } catch (error) {
      console.log('[Survey] Error checking:', error);
    }
  };

  const checkPendingTrade = async () => {
    try {
      const response = await dcaAPI.getPendingTrade();
      if (response.success && response.pending) {
        setPendingTrade(response.tradeData);
      } else {
        setPendingTrade(null);
      }
    } catch (error) {
      // Silently fail - pending trade check is non-critical
    }
  };

  const checkPendingWithdrawal = async () => {
    try {
      const response = await dcaAPI.getWithdrawalStatus();
      const windowOpen = response?.success && response.withdrawalWindow?.isOpen;
      const notSkipped = !response?.withdrawalWindow?.isSkipped;
      const hasBalance = (response?.unwithdrawnBalance?.btc || 0) > 0;
      const hasAddress = !!response?.walletAddress;
      if (windowOpen && notSkipped && hasBalance && hasAddress) {
        setPendingWithdrawal({
          btcAmount: response.unwithdrawnBalance.btc,
          eurAmount: response.unwithdrawnBalance.fiat,
          address: response.walletAddress,
          appWithdrawal: response.appWithdrawal,
        });
      } else {
        setPendingWithdrawal(null);
      }
    } catch (error) {
      // Silently fail - pending withdrawal check is non-critical
    }
  };

  // Re-check setup and pending trade when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkSetup();
      checkSubscription();
      checkPendingTrade();
      checkPendingWithdrawal();
    }, [])
  );

  const checkSetup = async () => {
    const userId = user?._id;
    const exchange = await getSelectedExchange(userId);
    const keys = await hasExchangeKeys(exchange, userId);
    setHasKeys(keys);
  };

  const checkSubscription = async () => {
    try {
      const response = await authAPI.getSubscriptionStatus();
      if (response?.success) {
        setHasActiveSubscription(response.data.hasActiveSubscription || false);
      }
    } catch (error) {
      // Non-critical; leave existing value
    }
  };

  const handleLumpSum = () => {
    if (!hasKeys) {
      Alert.alert(
        'Setup Required',
        'Configure your exchange API keys first to enable trading.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up', onPress: () => navigation.navigate('APIKeys') },
        ]
      );
      return;
    }
    if (!hasActiveSubscription) {
      Alert.alert(
        'Subscription Required',
        'Lump-sum trades are a subscriber feature. Subscribe to enable one-off buys directly from the app.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Subscribe', onPress: () => navigation.navigate('Settings') },
        ]
      );
      return;
    }
    navigation.navigate('LumpSumTrade');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([checkSetup(), checkSubscription(), checkPendingTrade(), checkPendingWithdrawal()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleCloseSurvey = () => {
    setShowSurvey(false);
  };

  const styles = createStyles(colors);

  return (
    <>
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>

      {!hasKeys && (
        <View style={styles.setupCard}>
          <Ionicons name="warning" size={32} color={colors.warning} style={styles.setupIcon} />
          <View style={styles.setupTextContainer}>
            <Text style={styles.setupTitle}>Setup Required</Text>
            <Text style={styles.setupText}>
              Configure your exchange API keys to enable trading and withdrawals. Tap the "Keys" tab below to get started.
            </Text>
          </View>
        </View>
      )}

      {pendingTrade && (
        <TouchableOpacity
          style={styles.pendingTradeCard}
          onPress={() => navigation.navigate('TradeExecution', { tradeData: pendingTrade })}
          activeOpacity={0.8}
        >
          <Ionicons name="cart" size={32} color={colors.background} style={styles.pendingTradeIcon} />
          <View style={styles.pendingTradeTextContainer}>
            <Text style={styles.pendingTradeTitle}>DCA Purchase Ready</Text>
            <Text style={styles.pendingTradeText}>
              Tap to execute your {getCurrencySymbol(pendingTrade.currency)}{pendingTrade.fiatAmount} BTC purchase
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.background} />
        </TouchableOpacity>
      )}

      {pendingWithdrawal && (
        <TouchableOpacity
          style={styles.pendingTradeCard}
          onPress={() => navigation.navigate('WithdrawalApproval', { withdrawalData: pendingWithdrawal })}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up-circle" size={32} color={colors.background} style={styles.pendingTradeIcon} />
          <View style={styles.pendingTradeTextContainer}>
            <Text style={styles.pendingTradeTitle}>Withdrawal Ready</Text>
            <Text style={styles.pendingTradeText}>
              Tap to withdraw {pendingWithdrawal.btcAmount} BTC to your hardware wallet
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.background} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.lumpSumCard}
        onPress={handleLumpSum}
        activeOpacity={0.8}
      >
        <Ionicons name="flash" size={28} color={colors.primary} style={styles.lumpSumIcon} />
        <View style={styles.lumpSumTextContainer}>
          <Text style={styles.lumpSumTitle}>Lump-Sum Buy</Text>
          <Text style={styles.lumpSumText}>
            Execute a one-off Bitcoin purchase, separate from your scheduled DCA.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          1. Configure your DCA schedule and wallet address in Settings
        </Text>
        <Text style={styles.infoText}>
          2. At your scheduled time, receive a notification to execute the trade
        </Text>
        <Text style={styles.infoText}>
          3. Tap the notification and confirm to execute the market buy order
        </Text>
        <Text style={styles.infoText}>
          4. BTC accumulates on your exchange until withdrawal time
        </Text>
        <Text style={styles.infoText}>
          5. On the last Friday of every month, approve withdrawal to your hardware wallet
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your DCA Journey</Text>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>API Keys</Text>
            <Text style={styles.statValue}>
              {hasKeys ? '✅ Configured' : '⚠️ Not Set'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={styles.statValue}>Active</Text>
          </View>
        </View>

        <View style={styles.tipsCard}>
          <Ionicons name="bulb" size={28} color={colors.secondary} style={styles.tipsIcon} />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Tip</Text>
            <Text style={styles.tipsText}>
              Use the tabs below to navigate between Home, Transaction History, API Keys, and Settings.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>

    <SurveyModal visible={showSurvey} onClose={handleCloseSurvey} />
    </>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  logoutButton: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  pendingTradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    margin: 20,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  pendingTradeIcon: {
    marginRight: 12,
  },
  pendingTradeTextContainer: {
    flex: 1,
  },
  pendingTradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    marginBottom: 2,
  },
  pendingTradeText: {
    fontSize: 14,
    color: colors.background,
    opacity: 0.9,
  },
  lumpSumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lumpSumIcon: {
    marginRight: 12,
  },
  lumpSumTextContainer: {
    flex: 1,
  },
  lumpSumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  lumpSumText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  setupIcon: {
    marginRight: 12,
  },
  setupTextContainer: {
    flex: 1,
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  setupText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    margin: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.text,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  tipsIcon: {
    marginRight: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
