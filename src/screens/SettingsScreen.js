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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { authAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../utils/currency';

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
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [currency, setCurrency] = useState('EUR');
  const [weeklyDcaAmount, setWeeklyDcaAmount] = useState('35');
  const [exchangeTradingFee, setExchangeTradingFee] = useState('0.1');
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedDay, setSelectedDay] = useState('thursday');
  const [selectedHour, setSelectedHour] = useState(8);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getSettings();

      if (response.success) {
        const { settings } = response.data;
        setCurrency(settings.currency || 'EUR');
        setWeeklyDcaAmount(settings.weeklyDcaAmount?.toString() || '35');
        setExchangeTradingFee(settings.exchangeTradingFee?.toString() || '0.1');
        setWalletAddress(settings.hardwareWalletAddress || '');
        setSelectedDay(settings.purchaseSchedule?.dayOfWeek || 'thursday');
        setSelectedHour(settings.purchaseSchedule?.hour ?? 8);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate inputs
    const amount = parseFloat(weeklyDcaAmount);
    const fee = parseFloat(exchangeTradingFee);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid weekly DCA amount');
      return;
    }

    if (isNaN(fee) || fee < 0 || fee > 100) {
      Alert.alert('Invalid Input', 'Trading fee must be between 0 and 100%');
      return;
    }

    // Auto-trim wallet address
    const trimmedWalletAddress = walletAddress.trim();

    // Validate Bitcoin address with helpful error messages
    const addressError = getBitcoinAddressError(walletAddress);
    if (addressError) {
      Alert.alert('Invalid Bitcoin Address', addressError);
      return;
    }

    // Update state with trimmed address if it changed
    if (walletAddress !== trimmedWalletAddress) {
      setWalletAddress(trimmedWalletAddress);
    }

    try {
      setSaving(true);

      const response = await authAPI.updateSettings({
        currency: currency,
        weeklyDcaAmount: amount,
        exchangeTradingFee: fee,
        hardwareWalletAddress: trimmedWalletAddress,
        purchaseSchedule: {
          dayOfWeek: selectedDay,
          hour: selectedHour,
        },
      });

      if (response.success) {
        Alert.alert('Success', 'Settings saved successfully!');
      } else {
        Alert.alert('Error', response.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const isValidBitcoinAddress = (address) => {
    // Allow empty/null address (optional field)
    if (!address || address.trim() === '') {
      return true;
    }

    const trimmedAddress = address.trim();

    // Validate Bitcoin address formats
    // Legacy addresses (1...)
    const isLegacy = /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmedAddress);
    // P2SH addresses (3...)
    const isP2SH = /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmedAddress);
    // Bech32 SegWit addresses (bc1q...) - lowercase only
    const isBech32 = /^(bc1q)[a-z0-9]{38,58}$/.test(trimmedAddress);
    // Taproot addresses (bc1p...) - always 62 characters total
    const isTaproot = /^(bc1p)[a-z0-9]{58}$/.test(trimmedAddress);

    return isLegacy || isP2SH || isBech32 || isTaproot;
  };

  const getBitcoinAddressError = (address) => {
    if (!address || address.trim() === '') {
      return null;
    }

    const trimmedAddress = address.trim();

    // Check for whitespace
    if (address !== trimmedAddress) {
      return 'Address contains leading or trailing spaces. Please remove them.';
    }

    // Check if valid
    if (isValidBitcoinAddress(trimmedAddress)) {
      return null;
    }

    // Provide helpful error messages for common mistakes
    if (trimmedAddress.match(/^bc1[^qp]/i)) {
      return 'Bech32 addresses should start with "bc1q" (SegWit) or "bc1p" (Taproot)';
    } else if (trimmedAddress.match(/^[13]/)) {
      return 'Legacy/P2SH addresses must be 26-35 characters long (no 0, O, I, or l)';
    } else if (trimmedAddress.match(/^bc1/i) && /[^a-z0-9]/.test(trimmedAddress)) {
      return 'Bech32 addresses must contain only lowercase letters and numbers';
    } else if (trimmedAddress.match(/^BC1/)) {
      return 'Bech32 addresses must be lowercase';
    } else {
      return 'Please enter a valid Bitcoin address (starts with 1, 3, bc1q, or bc1p)';
    }
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
              onValueChange={(itemValue) => setCurrency(itemValue)}
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

        {/* Weekly DCA Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weekly DCA Amount ({currency})</Text>
          <Text style={styles.description}>
            Amount in {currency} to purchase each week
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
            <TextInput
              style={styles.input}
              value={weeklyDcaAmount}
              onChangeText={setWeeklyDcaAmount}
              keyboardType="decimal-pad"
              placeholder="35"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {/* Exchange Trading Fee */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Exchange Trading Fee (%)</Text>
          <Text style={styles.description}>
            Trading fee percentage charged by your exchange (default: 0.1%)
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={exchangeTradingFee}
              onChangeText={setExchangeTradingFee}
              keyboardType="decimal-pad"
              placeholder="0.1"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.percentSymbol}>%</Text>
          </View>
        </View>

        {/* Purchase Schedule */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Purchase Schedule</Text>
          <Text style={styles.description}>
            When to execute your weekly DCA purchase
          </Text>

          <Text style={styles.subLabel}>Day of Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayButton,
                  selectedDay === day.value && styles.dayButtonSelected
                ]}
                onPress={() => setSelectedDay(day.value)}
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
                onPress={() => setSelectedHour(hour.value)}
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

        <Text style={styles.sectionTitle}>Withdrawal Settings</Text>

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
            onBlur={() => {
              // Auto-trim on blur
              if (walletAddress) {
                setWalletAddress(walletAddress.trim());
              }
            }}
            placeholder="bc1q..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ⓘ Your purchase schedule is in server time (UTC). You'll receive a notification to execute the trade at the scheduled time.
          </Text>
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
    marginRight: 12,
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
    marginBottom: 12,
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
  },
  picker: {
    flex: 1,
    height: Platform.OS === 'ios' ? 180 : 48,
    color: colors.text,
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
});
