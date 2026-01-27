import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
  Linking,
  Modal,
  SafeAreaView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import QRCode from 'react-native-qrcode-svg';
import { authAPI, awardsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../utils/currency';
import { COUNTRIES, getAvailableExchanges, getCountryName, getCountryFlag } from '../config/countries';
import storage from '../utils/storage';
import { isValidBitcoinAddress, getBitcoinAddressError } from '../utils/bitcoinValidation';

const FREQUENCIES = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
];

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  label: `${i.toString().padStart(2, '0')}:00`,
  value: i,
}));

export default function SettingsScreen({ navigation }) {
  const { logout } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [country, setCountry] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [weeklyDcaAmount, setWeeklyDcaAmount] = useState('35');
  const [walletAddress, setWalletAddress] = useState('');
  const [appWithdrawal, setAppWithdrawal] = useState(true);
  const [selectedFrequency, setSelectedFrequency] = useState('weekly');
  const [selectedDay, setSelectedDay] = useState('thursday');
  const [selectedHour, setSelectedHour] = useState(8);

  // Notification preferences
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);
  const [withdrawalReminders, setWithdrawalReminders] = useState(true);
  const [purchaseConfirmations, setPurchaseConfirmations] = useState(true);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  // Subscription state
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isManualTrial, setIsManualTrial] = useState(false);
  const [manualTrialEnd, setManualTrialEnd] = useState(null);
  const [canClaimRetentionTrial, setCanClaimRetentionTrial] = useState(false);
  const [claimingTrial, setClaimingTrial] = useState(false);

  // Account deletion state
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteAdditionalFeedback, setDeleteAdditionalFeedback] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const DELETE_REASONS = [
    { value: 'thought_exchange', label: 'I thought this was an exchange' },
    { value: 'too_expensive', label: 'Too expensive / pricing' },
    { value: 'not_using', label: 'Not using the service' },
    { value: 'missing_features', label: 'Missing features I need' },
    { value: 'found_alternative', label: 'Found a better alternative' },
    { value: 'technical_issues', label: 'Technical issues / bugs' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [settingsResponse, twoFAResponse, subscriptionResponse, storedCountry] = await Promise.all([
        authAPI.getSettings(),
        authAPI.get2FAStatus(),
        authAPI.getSubscriptionStatus(),
        storage.getItem('user_country'),
      ]);

      if (settingsResponse.success) {
        const { settings } = settingsResponse.data;
        // Load country from server settings or local storage
        setCountry(settings.country || storedCountry || '');
        setCurrency(settings.currency || 'EUR');
        setWeeklyDcaAmount(settings.weeklyDcaAmount?.toString() || '35');
        setWalletAddress(settings.hardwareWalletAddress || '');
        setAppWithdrawal(settings.appWithdrawal ?? true);
        setSelectedFrequency(settings.purchaseSchedule?.frequency || 'weekly');
        setSelectedDay(settings.purchaseSchedule?.dayOfWeek || 'thursday');
        setSelectedHour(settings.purchaseSchedule?.hour ?? 8);

        // Load notification preferences
        setAnomalyAlerts(settings.notifications?.anomalyAlerts ?? true);
        setWithdrawalReminders(settings.notifications?.withdrawalReminders ?? true);
        setPurchaseConfirmations(settings.notifications?.purchaseConfirmations ?? true);
      }

      if (twoFAResponse.success) {
        setTwoFactorEnabled(twoFAResponse.data.enabled);
      }

      if (subscriptionResponse.success) {
        setHasActiveSubscription(subscriptionResponse.data.hasActiveSubscription || false);
        setIsManualTrial(subscriptionResponse.data.isManualTrial || false);
        setManualTrialEnd(subscriptionResponse.data.manualTrialEnd || null);
        setCanClaimRetentionTrial(subscriptionResponse.data.canClaimRetentionTrial || false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save settings whenever they change
  const saveSettings = async (updates) => {
    try {
      setSaving(true);
      await authAPI.updateSettings(updates);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Handlers for immediate save on change
  const handleCountryChange = async (value) => {
    setCountry(value);
    await storage.setItem('user_country', value);
    await saveSettings({ country: value });
    setShowCountryModal(false);
  };

  const handleCurrencyChange = async (value) => {
    setCurrency(value);
    await saveSettings({ currency: value });
  };

  const handleAppWithdrawalChange = async (value) => {
    setAppWithdrawal(value);
    await saveSettings({ appWithdrawal: value });
  };

  const handleFrequencyChange = async (value) => {
    setSelectedFrequency(value);
    await saveSettings({ purchaseSchedule: { frequency: value, dayOfWeek: selectedDay, hour: selectedHour } });
  };

  const handleDayChange = async (value) => {
    setSelectedDay(value);
    await saveSettings({ purchaseSchedule: { frequency: selectedFrequency, dayOfWeek: value, hour: selectedHour } });
  };

  const handleHourChange = async (value) => {
    setSelectedHour(value);
    await saveSettings({ purchaseSchedule: { frequency: selectedFrequency, dayOfWeek: selectedDay, hour: value } });
  };

  const handleAnomalyAlertsChange = async (value) => {
    setAnomalyAlerts(value);
    await saveSettings({ notifications: { anomalyAlerts: value, withdrawalReminders, purchaseConfirmations } });
  };

  const handleWithdrawalRemindersChange = async (value) => {
    setWithdrawalReminders(value);
    await saveSettings({ notifications: { anomalyAlerts, withdrawalReminders: value, purchaseConfirmations } });
  };

  const handlePurchaseConfirmationsChange = async (value) => {
    setPurchaseConfirmations(value);
    await saveSettings({ notifications: { anomalyAlerts, withdrawalReminders, purchaseConfirmations: value } });
  };

  // Save text fields on blur
  const handleDcaAmountBlur = async () => {
    const amount = parseFloat(weeklyDcaAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid weekly DCA amount');
      return;
    }
    await saveSettings({ weeklyDcaAmount: amount });
  };

  const handleWalletAddressBlur = async () => {
    const trimmedAddress = walletAddress.trim();
    if (walletAddress !== trimmedAddress) {
      setWalletAddress(trimmedAddress);
    }
    const addressError = getBitcoinAddressError(trimmedAddress);
    if (addressError) {
      Alert.alert('Invalid Bitcoin Address', addressError);
      return;
    }
    await saveSettings({ hardwareWalletAddress: trimmedAddress });

    // Check for awards after saving a valid BTC address
    if (trimmedAddress) {
      try {
        await awardsAPI.checkAwards();
      } catch (error) {
        // Silently fail - awards are not critical
      }
    }
  };

  const confirmDeleteAccount = () => {
    // Show the deletion reason modal first
    setDeleteReason('');
    setDeleteAdditionalFeedback('');
    setShowDeleteReasonModal(true);
  };

  const handleProceedToDelete = () => {
    setShowDeleteReasonModal(false);

    // If user selected "too expensive" and is eligible for retention trial, offer it
    if (deleteReason === 'too_expensive' && canClaimRetentionTrial) {
      Alert.alert(
        'Wait! Try Us Free for 14 Days',
        'Before you go, we\'d love for you to experience the full value of My Bitcoin DCA.\n\nWe\'re offering you a complimentary 14-day trial with full access to all premium features - no payment required.\n\nGive it a try?',
        [
          {
            text: 'No Thanks',
            style: 'cancel',
            onPress: showFinalDeleteConfirmation,
          },
          {
            text: 'Claim Free Trial',
            onPress: handleClaimRetentionTrial,
          },
        ],
        { cancelable: true }
      );
    } else {
      showFinalDeleteConfirmation();
    }
  };

  const showFinalDeleteConfirmation = () => {
    Alert.alert(
      'Confirm Account Deletion',
      'Are you absolutely sure you want to delete your account?\n\nThis will permanently remove:\n• All your purchase history\n• All withdrawal transactions\n• Your subscription (if active)\n• All settings and preferences\n• All account data\n\nThis action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: handleDeleteAccount,
        },
      ],
      { cancelable: true }
    );
  };

  const handleClaimRetentionTrial = async () => {
    try {
      setClaimingTrial(true);
      const response = await authAPI.claimRetentionTrial();

      if (response.success) {
        // Update local state
        setHasActiveSubscription(true);
        setIsManualTrial(true);
        setManualTrialEnd(response.data.trialEnd);
        setCanClaimRetentionTrial(false);

        Alert.alert(
          'Trial Activated!',
          'Your 14-day free trial is now active. Enjoy full access to all premium features!\n\nWe hope you\'ll love the experience.',
          [{ text: 'Awesome!' }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to activate trial');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to activate trial. Please try again.');
    } finally {
      setClaimingTrial(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const response = await authAPI.deleteAccount(deleteReason, deleteAdditionalFeedback);

      if (response.success) {
        // Logout - this will clear all storage and reset auth state
        await logout();

        Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
      } else {
        Alert.alert('Error', response.message || 'Failed to delete account');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  // 2FA handlers
  const handle2FAToggle = async (value) => {
    if (value) {
      // Enable 2FA - initiate setup
      try {
        setTwoFactorLoading(true);
        const response = await authAPI.setup2FA();
        if (response.success) {
          setTwoFactorSetupData(response.data);
          setIsDisabling2FA(false);
          setTwoFactorCode('');
          setShow2FAModal(true);
        } else {
          Alert.alert('Error', response.message || 'Failed to setup 2FA');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to setup 2FA. Please try again.');
      } finally {
        setTwoFactorLoading(false);
      }
    } else {
      // Disable 2FA - show verification modal
      setIsDisabling2FA(true);
      setTwoFactorCode('');
      setShow2FAModal(true);
    }
  };

  const handleConfirm2FA = async () => {
    if (twoFactorCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code.');
      return;
    }

    try {
      setTwoFactorLoading(true);

      if (isDisabling2FA) {
        // Disable 2FA
        const response = await authAPI.disable2FA(twoFactorCode);
        if (response.success) {
          setTwoFactorEnabled(false);
          setShow2FAModal(false);
          setTwoFactorCode('');
          setTwoFactorSetupData(null);
          Alert.alert('Success', '2FA has been disabled for withdrawals.');
        } else {
          Alert.alert('Error', response.message || 'Invalid verification code.');
        }
      } else {
        // Enable 2FA
        const response = await authAPI.enable2FA(twoFactorCode);
        if (response.success) {
          setTwoFactorEnabled(true);
          setShow2FAModal(false);
          setTwoFactorCode('');
          setTwoFactorSetupData(null);
          Alert.alert('Success', '2FA has been enabled for withdrawals. You will need to enter a code from your authenticator app when approving withdrawals.');
        } else {
          Alert.alert('Error', response.message || 'Invalid verification code.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleClose2FAModal = () => {
    setShow2FAModal(false);
    setTwoFactorCode('');
    setTwoFactorSetupData(null);
    setIsDisabling2FA(false);
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Subscription Status */}
        <TouchableOpacity
          style={[
            styles.subscriptionStatusCard,
            hasActiveSubscription && !isManualTrial && styles.subscriptionStatusCardActive,
            isManualTrial && styles.subscriptionStatusCardTrial,
          ]}
          onPress={() => Linking.openURL(
            isManualTrial
              ? 'https://www.mybitcoindca.com/pricing'
              : hasActiveSubscription
                ? 'https://www.mybitcoindca.com/settings'
                : 'https://www.mybitcoindca.com/pricing'
          )}
          activeOpacity={0.7}
        >
          <View style={styles.subscriptionStatusContent}>
            <Ionicons
              name={isManualTrial ? 'time' : hasActiveSubscription ? 'checkmark-circle' : 'rocket'}
              size={28}
              color={isManualTrial ? colors.info : hasActiveSubscription ? colors.success : colors.primary}
            />
            <View style={styles.subscriptionStatusText}>
              <Text style={[
                styles.subscriptionStatusTitle,
                hasActiveSubscription && !isManualTrial && styles.subscriptionStatusTitleActive,
                isManualTrial && styles.subscriptionStatusTitleTrial,
              ]}>
                {isManualTrial
                  ? 'Free Trial Active'
                  : hasActiveSubscription
                    ? 'Subscription Active'
                    : 'No Active Subscription'}
              </Text>
              <Text style={styles.subscriptionStatusSubtitle}>
                {isManualTrial
                  ? `Expires ${manualTrialEnd ? new Date(manualTrialEnd).toLocaleDateString() : 'soon'}`
                  : hasActiveSubscription
                    ? 'Manage your subscription'
                    : 'Subscribe to start DCAing'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Appearance</Text>

        {/* Dark Mode Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name={isDarkMode ? 'moon' : 'sunny'}
                size={24}
                color={colors.secondary}
                style={styles.settingIcon}
              />
              <View>
                <Text style={styles.label}>Dark Mode</Text>
                <Text style={styles.description}>
                  {isDarkMode ? 'Dark theme enabled' : 'Light theme enabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Region</Text>

        {/* Country Selector */}
        <TouchableOpacity
          style={styles.inputGroup}
          onPress={() => setShowCountryModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="globe-outline"
                size={24}
                color={colors.secondary}
                style={styles.settingIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Country</Text>
                <Text style={styles.description}>
                  {country ? `${getCountryFlag(country)} ${getCountryName(country)}` : 'Select your country'}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>DCA Settings</Text>

        {/* Currency Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferred Currency</Text>
          <Text style={styles.description}>
            Currency for your DCA purchases and display
          </Text>
          <View style={[styles.inputContainer, styles.pickerContainer]}>
            <Picker
              selectedValue={currency}
              onValueChange={handleCurrencyChange}
              style={styles.picker}
              dropdownIconColor={colors.text}
              itemStyle={Platform.OS === 'ios' ? styles.pickerItem : undefined}
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <Picker.Item
                  key={curr.code}
                  label={`${curr.symbol} ${curr.name} (${curr.code})`}
                  value={curr.code}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* DCA Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>DCA Amount ({currency})</Text>
          <Text style={styles.description}>
            Amount in {currency} to purchase {selectedFrequency === 'biweekly' ? 'every 2 weeks' : 'each week'}
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
            <TextInput
              style={styles.input}
              value={weeklyDcaAmount}
              onChangeText={setWeeklyDcaAmount}
              onBlur={handleDcaAmountBlur}
              keyboardType="decimal-pad"
              placeholder="35"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {/* Purchase Schedule */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Purchase Schedule</Text>
          <Text style={styles.description}>
            When to execute your DCA purchases
          </Text>

          <Text style={styles.subLabel}>Frequency</Text>
          <View style={styles.frequencySelector}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                style={[
                  styles.frequencyButton,
                  selectedFrequency === freq.value && styles.frequencyButtonSelected
                ]}
                onPress={() => handleFrequencyChange(freq.value)}
              >
                <Text style={[
                  styles.frequencyButtonText,
                  selectedFrequency === freq.value && styles.frequencyButtonTextSelected
                ]}>
                  {freq.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.subLabel}>Day of Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayButton,
                  selectedDay === day.value && styles.dayButtonSelected
                ]}
                onPress={() => handleDayChange(day.value)}
              >
                <Text style={[
                  styles.dayButtonText,
                  selectedDay === day.value && styles.dayButtonTextSelected
                ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.subLabel}>Time (24h)</Text>
          <View style={styles.timeGrid}>
            {HOURS.map((hour) => (
              <TouchableOpacity
                key={hour.value}
                style={[
                  styles.timeButton,
                  selectedHour === hour.value && styles.timeButtonSelected
                ]}
                onPress={() => handleHourChange(hour.value)}
              >
                <Text style={[
                  styles.timeButtonText,
                  selectedHour === hour.value && styles.timeButtonTextSelected
                ]}>
                  {hour.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

         <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ⓘ Your purchase schedule is in server time (UTC). You'll receive a notification to execute the trade at the scheduled time.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Push Notifications</Text>

        {/* Anomaly Alerts */}
        <View style={[styles.inputGroup, !hasActiveSubscription && styles.disabledInputGroup]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="notifications"
                size={24}
                color={hasActiveSubscription ? colors.secondary : colors.textTertiary}
                style={styles.settingIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, !hasActiveSubscription && styles.disabledLabel]}>Anomaly Alerts (Beta)</Text>
                <Text style={styles.description}>
                  Get notified when unusual market conditions present buying opportunities
                </Text>
              </View>
            </View>
            <Switch
              value={anomalyAlerts}
              onValueChange={handleAnomalyAlertsChange}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor="#fff"
              disabled={!hasActiveSubscription}
            />
          </View>
        </View>

        {/* Withdrawal Reminders */}
        <View style={[styles.inputGroup, !hasActiveSubscription && styles.disabledInputGroup]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="wallet"
                size={24}
                color={hasActiveSubscription ? colors.secondary : colors.textTertiary}
                style={styles.settingIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, !hasActiveSubscription && styles.disabledLabel]}>Withdrawal Reminders</Text>
                <Text style={styles.description}>
                  Get reminded when it's time to withdraw to your hardware wallet
                </Text>
              </View>
            </View>
            <Switch
              value={withdrawalReminders}
              onValueChange={handleWithdrawalRemindersChange}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor="#fff"
              disabled={!hasActiveSubscription}
            />
          </View>
        </View>

        {/* Purchase Confirmations */}
        <View style={[styles.inputGroup, !hasActiveSubscription && styles.disabledInputGroup]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={hasActiveSubscription ? colors.secondary : colors.textTertiary}
                style={styles.settingIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, !hasActiveSubscription && styles.disabledLabel]}>Purchase Confirmations</Text>
                <Text style={styles.description}>
                  Get notified when your scheduled DCA purchases are executed
                </Text>
              </View>
            </View>
            <Switch
              value={purchaseConfirmations}
              onValueChange={handlePurchaseConfirmationsChange}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor="#fff"
              disabled={!hasActiveSubscription}
            />
          </View>
        </View>

        {/* Subscription Required Notice */}
        {!hasActiveSubscription && (
          <TouchableOpacity
            style={styles.subscriptionNotice}
            onPress={() => Linking.openURL('https://www.mybitcoindca.com/pricing')}
            activeOpacity={0.7}
          >
            <Ionicons name="rocket" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.subscriptionNoticeText}>
                <Text style={{ fontWeight: '600' }}>Get Started: </Text>
                Subscribe to begin your DCA journey and receive alerts.
              </Text>
              <Text style={styles.subscriptionNoticeLink}>View Plans →</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Withdrawal Settings</Text>

        {/* App Withdrawal Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="phone-portrait"
                size={24}
                color={colors.secondary}
                style={styles.settingIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>App Withdrawal Mode</Text>
                <Text style={styles.description}>
                  {appWithdrawal
                    ? 'Withdrawals execute automatically through the app. You MUST enable withdrawal permissions in your exchange API settings.'
                    : 'You will withdraw manually on your exchange. Do NOT enable withdrawal permissions in your API settings.'}
                </Text>
              </View>
            </View>
            <Switch
              value={appWithdrawal}
              onValueChange={handleAppWithdrawalChange}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Bitcoin Wallet Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bitcoin Wallet Address</Text>
          <Text style={styles.description}>
            Your hardware wallet address for withdrawals (optional)
          </Text>
          <TextInput
            style={[styles.input, styles.addressInput]}
            value={walletAddress}
            onChangeText={setWalletAddress}
            onBlur={handleWalletAddressBlur}
            placeholder="bc1q..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
        </View>

        <Text style={styles.sectionTitle}>Security</Text>

        {/* 2FA Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="shield-checkmark"
                size={24}
                color={twoFactorEnabled ? colors.success : colors.secondary}
                style={styles.settingIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Two-Factor Authentication</Text>
                <Text style={styles.description}>
                  {twoFactorEnabled
                    ? 'Enabled - You will need to enter a code from your authenticator app when approving withdrawals.'
                    : 'Add an extra layer of security to your withdrawals using an authenticator app.'}
                </Text>
              </View>
            </View>
            {twoFactorLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={twoFactorEnabled}
                onValueChange={handle2FAToggle}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor="#fff"
              />
            )}
          </View>
          {twoFactorEnabled && (
            <TouchableOpacity
              style={styles.twoFactorHelpLink}
              onPress={() => Linking.openURL('mailto:support@mybitcoindca.com?subject=2FA%20Recovery%20Request')}
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.textTertiary} />
              <Text style={styles.twoFactorHelpText}>
                Lost access to your authenticator? Contact support@mybitcoindca.com
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Danger Zone</Text>

        {/* Delete Account */}
        <View style={[styles.inputGroup, styles.dangerZone]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="warning"
                size={24}
                color="#dc3545"
                style={styles.settingIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerLabel}>Delete Account</Text>
                <Text style={styles.description}>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={confirmDeleteAccount}
          >
            <Text style={styles.deleteButtonText}>Delete My Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>About</Text>

        {/* Visit Website */}
        <TouchableOpacity
          style={styles.inputGroup}
          onPress={() => Linking.openURL('https://www.mybitcoindca.com')}
          activeOpacity={0.7}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name="globe-outline"
                size={24}
                color={colors.secondary}
                style={styles.settingIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Visit Website</Text>
                <Text style={styles.description}>
                  Learn more about My Bitcoin DCA
                </Text>
              </View>
            </View>
            <Ionicons
              name="open-outline"
              size={20}
              color={colors.textTertiary}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* 2FA Setup/Disable Modal */}
      <Modal
        visible={show2FAModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClose2FAModal}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <ScrollView contentContainerStyle={styles.modalFullScreenContent}>
            <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isDisabling2FA ? 'Disable 2FA' : 'Enable 2FA'}
            </Text>
            <TouchableOpacity onPress={handleClose2FAModal} style={styles.modalCloseButton}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

            {!isDisabling2FA && twoFactorSetupData && (
              <>
                <Text style={styles.modalDescription}>
                  Add this account to your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                </Text>

                {/* Manual Entry Section - Primary for mobile users */}
                <View style={styles.manualEntrySection}>
                  <Text style={styles.manualEntryTitle}>Manual Entry (Recommended on Mobile)</Text>
                  <Text style={styles.manualEntryInstructions}>
                    In your authenticator app, tap "+" or "Add account", then select "Enter setup key" or "Manual entry"
                  </Text>
                  <View style={styles.secretContainer}>
                    <Text style={styles.secretCodeDisplay}>{twoFactorSetupData.secret}</Text>
                    <TouchableOpacity
                      style={styles.copySecretButton}
                      onPress={async () => {
                        await Clipboard.setStringAsync(twoFactorSetupData.secret);
                        Alert.alert('Copied', 'Secret code copied to clipboard');
                      }}
                    >
                      <Ionicons name="copy-outline" size={20} color="#fff" />
                      <Text style={styles.copySecretButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.accountNameHint}>
                    Account name: MyBitcoinDCA
                  </Text>
                </View>

                {/* QR Code Section - For scanning from another device */}
                <View style={styles.qrSection}>
                  <Text style={styles.qrSectionTitle}>Or scan QR code (from another device)</Text>
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={twoFactorSetupData.otpauthUrl}
                      size={160}
                      backgroundColor="white"
                    />
                  </View>
                </View>
              </>
            )}

            {isDisabling2FA && (
              <Text style={styles.modalDescription}>
                Enter the 6-digit code from your authenticator app to disable 2FA.
              </Text>
            )}

            <Text style={styles.codeLabel}>
              {isDisabling2FA ? 'Verification Code' : 'Enter code to verify'}
            </Text>
            <TextInput
              style={styles.codeInput}
              value={twoFactorCode}
              onChangeText={(text) => setTwoFactorCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="000000"
              placeholderTextColor={colors.textTertiary}
              maxLength={6}
              textAlign="center"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleClose2FAModal}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  twoFactorLoading && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirm2FA}
                disabled={twoFactorLoading}
              >
                {twoFactorLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    {isDisabling2FA ? 'Disable' : 'Enable'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowCountryModal(false);
          setCountrySearch('');
        }}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCountryModal(false);
                setCountrySearch('');
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.countrySearchContainer}>
            <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.countrySearchIcon} />
            <TextInput
              style={styles.countrySearchInput}
              placeholder="Search countries..."
              placeholderTextColor={colors.textTertiary}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {countrySearch.length > 0 && (
              <TouchableOpacity onPress={() => setCountrySearch('')} style={styles.countrySearchClear}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            {COUNTRIES.filter(c =>
              c.name.toLowerCase().includes(countrySearch.toLowerCase())
            ).map((c) => {
              const exchanges = getAvailableExchanges(c.code);
              const hasExchanges = exchanges.length > 0;
              const isSelected = country === c.code;

              return (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.countryItem,
                    isSelected && styles.countryItemSelected,
                    !hasExchanges && styles.countryItemDisabled,
                  ]}
                  onPress={() => {
                    if (hasExchanges) {
                      handleCountryChange(c.code);
                      setCountrySearch('');
                    }
                  }}
                  disabled={!hasExchanges}
                >
                  <Text style={styles.countryFlag}>{getCountryFlag(c.code)}</Text>
                  <Text style={[
                    styles.countryName,
                    isSelected && styles.countryNameSelected,
                    !hasExchanges && styles.countryNameDisabled,
                  ]}>
                    {c.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Account Deletion Reason Modal */}
      <Modal
        visible={showDeleteReasonModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowDeleteReasonModal(false)}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <ScrollView contentContainerStyle={styles.modalFullScreenContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>We're sorry to see you go</Text>
              <TouchableOpacity
                onPress={() => setShowDeleteReasonModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              To help us improve, please tell us why you're leaving:
            </Text>

            <View style={styles.deleteReasonList}>
              {DELETE_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.deleteReasonItem,
                    deleteReason === reason.value && styles.deleteReasonItemSelected,
                  ]}
                  onPress={() => setDeleteReason(reason.value)}
                >
                  <View style={[
                    styles.deleteReasonRadio,
                    deleteReason === reason.value && styles.deleteReasonRadioSelected,
                  ]}>
                    {deleteReason === reason.value && (
                      <View style={styles.deleteReasonRadioInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.deleteReasonText,
                    deleteReason === reason.value && styles.deleteReasonTextSelected,
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.codeLabel}>Additional feedback (optional)</Text>
            <TextInput
              style={styles.deleteFeedbackInput}
              value={deleteAdditionalFeedback}
              onChangeText={setDeleteAdditionalFeedback}
              placeholder="Tell us more about your experience..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteReasonModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteConfirmButton,
                  deletingAccount && styles.modalButtonDisabled,
                ]}
                onPress={handleProceedToDelete}
                disabled={deletingAccount}
              >
                {deletingAccount ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 16,
  },
  inputGroup: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledInputGroup: {
    opacity: 0.6,
  },
  disabledLabel: {
    color: colors.textTertiary,
  },
  subscriptionStatusCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  subscriptionStatusCardActive: {
    borderColor: colors.success,
  },
  subscriptionStatusCardTrial: {
    borderColor: '#64D2FF',
  },
  subscriptionStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionStatusText: {
    flex: 1,
    marginLeft: 12,
  },
  subscriptionStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  subscriptionStatusTitleActive: {
    color: colors.success,
  },
  subscriptionStatusTitleTrial: {
    color: '#64D2FF',
  },
  subscriptionStatusSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  subscriptionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  subscriptionNoticeText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  subscriptionNoticeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
  },
  pickerContainer: {
    paddingHorizontal: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'ios' && {
      height: 180,
    }),
    ...(Platform.OS === 'android' && {
      paddingVertical: 4,
    }),
  },
  picker: {
    flex: 1,
    height: Platform.OS === 'ios' ? 180 : 56,
    color: colors.text,
    ...(Platform.OS === 'android' && {
      marginVertical: -8,
    }),
  },
  pickerItem: {
    height: 180,
    fontSize: 16,
    color: colors.text,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.text,
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginRight: 8,
  },
  percentSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginLeft: 8,
  },
  frequencySelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  frequencyButtonSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  frequencyButtonText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  frequencyButtonTextSelected: {
    color: '#fff',
  },
  daySelector: {
    maxHeight: 60,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: 8,
  },
  dayButtonSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  dayButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeButton: {
    width: 70,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  timeButtonSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  timeButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  timeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    minHeight: 54,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  dangerZone: {
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 4,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 2FA Modal styles
  modalFullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalFullScreenContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  // 2FA Help link styles
  twoFactorHelpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  twoFactorHelpText: {
    fontSize: 12,
    color: colors.textTertiary,
    flex: 1,
  },
  // Manual Entry Section styles
  manualEntrySection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  manualEntryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  manualEntryInstructions: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  secretContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  secretCodeDisplay: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text,
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 10,
    letterSpacing: 1,
  },
  copySecretButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  copySecretButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  accountNameHint: {
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  // QR Code Section styles
  qrSection: {
    marginBottom: 24,
  },
  qrSectionTitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignSelf: 'center',
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  codeInput: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text,
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    letterSpacing: 12,
    marginBottom: 32,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 'auto',
  },
  modalCancelButton: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  // Country modal styles
  countrySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countrySearchIcon: {
    marginRight: 8,
  },
  countrySearchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.text,
  },
  countrySearchClear: {
    padding: 4,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  countryItemDisabled: {
    opacity: 0.4,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  countryNameSelected: {
    color: colors.primary,
  },
  countryNameDisabled: {
    color: colors.textTertiary,
  },
  countryExchangeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  countryExchangeTextSelected: {
    color: colors.primary,
  },
  countryNoExchangeText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  // Delete reason modal styles
  deleteReasonList: {
    marginBottom: 20,
  },
  deleteReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deleteReasonItemSelected: {
    borderColor: '#dc3545',
    backgroundColor: '#dc354510',
  },
  deleteReasonRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteReasonRadioSelected: {
    borderColor: '#dc3545',
  },
  deleteReasonRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dc3545',
  },
  deleteReasonText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  deleteReasonTextSelected: {
    fontWeight: '600',
  },
  deleteFeedbackInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
    marginBottom: 24,
  },
  deleteConfirmButton: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#dc3545',
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
