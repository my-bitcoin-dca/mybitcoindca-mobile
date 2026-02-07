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
import { surveyAPI } from '../services/api';
import SurveyModal from '../components/SurveyModal';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [hasKeys, setHasKeys] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const surveyChecked = useRef(false);

  useEffect(() => {
    checkSetup();
    checkSurvey();
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

  // Re-check setup when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkSetup();
    }, [])
  );

  const checkSetup = async () => {
    const userId = user?._id;
    const exchange = await getSelectedExchange(userId);
    const keys = await hasExchangeKeys(exchange, userId);
    setHasKeys(keys);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkSetup();
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
