import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  EXCHANGES,
  getExchangeInfo,
  getSelectedExchange,
  setSelectedExchange,
  storeExchangeKeys,
  hasExchangeKeys,
  deleteExchangeKeys,
  getAccountBalances,
  getApiKeyInstructions,
  getWithdrawalNotes,
  getExchangesForCountry,
} from '../services/exchangeService';
import { authAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import storage from '../utils/storage';

export default function APIKeysScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?._id;
  const [selectedExchangeId, setSelectedExchangeId] = useState('binance');
  const [availableExchanges, setAvailableExchanges] = useState([]);
  const [userCountry, setUserCountry] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [hasKeys, setHasKeys] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Reload settings when screen is focused (in case country changed in Settings)
  const hasLoadedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      loadExchangeSettings(!hasLoadedOnce.current);
      hasLoadedOnce.current = true;
    }, [])
  );

  useEffect(() => {
    checkKeys();
  }, [selectedExchangeId]);

  const loadExchangeSettings = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setInitialLoading(true);
      }

      // Load country from local storage
      const countryCode = await storage.getItem('user_country');
      setUserCountry(countryCode || '');

      // Get available exchanges based on country
      const filteredExchanges = getExchangesForCountry(countryCode);
      setAvailableExchanges(filteredExchanges);

      // Load from server settings
      const response = await authAPI.getSettings();
      if (response.success && response.data?.settings?.exchange) {
        const serverExchange = response.data.settings.exchange;
        // Check if the server exchange is available in user's country
        const isAvailable = filteredExchanges.some(e => e.id === serverExchange);
        if (isAvailable) {
          setSelectedExchangeId(serverExchange);
        } else if (filteredExchanges.length > 0) {
          // Default to first available exchange
          setSelectedExchangeId(filteredExchanges[0].id);
        }
      } else {
        // Fall back to local storage
        const stored = await getSelectedExchange(userId);
        const isAvailable = filteredExchanges.some(e => e.id === stored);
        if (isAvailable) {
          setSelectedExchangeId(stored);
        } else if (filteredExchanges.length > 0) {
          setSelectedExchangeId(filteredExchanges[0].id);
        }
      }
    } catch (error) {
      const stored = await getSelectedExchange(userId);
      setSelectedExchangeId(stored);
    } finally {
      setInitialLoading(false);
    }
  };

  const checkKeys = async () => {
    const exists = await hasExchangeKeys(selectedExchangeId, userId);
    setHasKeys(exists);
  };

  const handleExchangeChange = async (exchangeId) => {
    setSelectedExchangeId(exchangeId);
    await setSelectedExchange(exchangeId, userId);

    // Save to server
    try {
      await authAPI.updateSettings({ exchange: exchangeId });
    } catch (error) {
      // Silently fail - local storage is primary
    }

    // Clear input fields when switching exchanges
    setApiKey('');
    setApiSecret('');
  };

  const handleSaveKeys = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      Alert.alert('Error', 'Please enter both API key and secret');
      return;
    }

    setLoading(true);
    try {
      await storeExchangeKeys(selectedExchangeId, apiKey.trim(), apiSecret.trim(), userId);
      setHasKeys(true);
      setApiKey('');
      setApiSecret('');
      const exchangeName = getExchangeInfo(selectedExchangeId).name;
      Alert.alert('Success', `${exchangeName} API keys saved securely on your device`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleTestKeys = async () => {
    setTesting(true);
    try {
      const result = await getAccountBalances(selectedExchangeId, userId);
      if (result.success) {
        const exchangeName = getExchangeInfo(selectedExchangeId).name;
        Alert.alert(
          'Success',
          `API keys are valid! Connected to ${exchangeName} successfully.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Invalid API keys or connection failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test API keys');
    } finally {
      setTesting(false);
    }
  };

  const handleDeleteKeys = () => {
    const exchangeName = getExchangeInfo(selectedExchangeId).name;
    Alert.alert(
      'Delete API Keys',
      `Are you sure you want to delete your ${exchangeName} API keys? You will need to re-enter them to approve trades and withdrawals.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteExchangeKeys(selectedExchangeId, userId);
            setHasKeys(false);
            Alert.alert('Deleted', 'API keys have been removed');
          },
        },
      ]
    );
  };

  const exchangeInfo = getExchangeInfo(selectedExchangeId);
  const instructions = getApiKeyInstructions(selectedExchangeId);
  const withdrawalNotes = getWithdrawalNotes(selectedExchangeId);

  const styles = createStyles(colors);

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Exchange API Keys</Text>
        <Text style={styles.subtitle}>
          Securely store your exchange API keys on YOUR device
        </Text>
      </View>

      {/* Exchange Selector */}
      <View style={styles.exchangeSelector}>
        <Text style={styles.sectionTitle}>Select Exchange</Text>
        {availableExchanges.length === 0 ? (
          <View style={styles.noExchangesCard}>
            <Ionicons name="warning-outline" size={32} color={colors.warning} />
            <Text style={styles.noExchangesText}>
              No exchanges are available in your region. Please update your country in Settings.
            </Text>
          </View>
        ) : (
          <View style={styles.exchangeButtons}>
            {availableExchanges.map((exchange) => (
              <TouchableOpacity
                key={exchange.id}
                style={[
                  styles.exchangeButton,
                  selectedExchangeId === exchange.id && styles.exchangeButtonActive,
                ]}
                onPress={() => handleExchangeChange(exchange.id)}
              >
                <Text
                  style={[
                    styles.exchangeButtonText,
                    selectedExchangeId === exchange.id && styles.exchangeButtonTextActive,
                  ]}
                >
                  {exchange.name}
                </Text>
                <Text
                  style={[
                    styles.exchangeButtonDesc,
                    selectedExchangeId === exchange.id && styles.exchangeButtonDescActive,
                  ]}
                >
                  {exchange.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🔐 On-Device Security (iOS Keychain)</Text>
        <Text style={styles.infoText}>
          • Keys are encrypted using iOS Keychain (Secure Enclave)
        </Text>
        <Text style={styles.infoText}>
          • Keys are stored ONLY on your device
        </Text>
        <Text style={styles.infoText}>
          • Keys NEVER leave your phone
        </Text>
        <Text style={styles.infoText}>
          • Keys are NEVER sent to our servers or logged
        </Text>
        <Text style={styles.infoText}>
          • You can revoke or delete your keys anytime
        </Text>
      </View>

      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>⚠️ User-Initiated Actions Only</Text>
        <Text style={styles.disclaimerText}>
          • All trades and withdrawals require YOUR manual approval
        </Text>
        <Text style={styles.disclaimerText}>
          • No automatic or background transactions
        </Text>
        <Text style={styles.disclaimerText}>
          • You control where funds go (your own wallet addresses)
        </Text>
        <Text style={styles.disclaimerText}>
          • This app does NOT hold or custody your funds
        </Text>
        <Text style={styles.disclaimerText}>
          • Trades execute directly on YOUR {exchangeInfo.name} account
        </Text>
      </View>

      {hasKeys ? (
        <View style={styles.card}>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{exchangeInfo.name} API Keys Configured</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={handleTestKeys}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.testButtonText}>Test Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDeleteKeys}
          >
            <Text style={styles.deleteButtonText}>Delete Keys</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enter Your {exchangeInfo.name} API Keys</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter your ${exchangeInfo.name} API key`}
              placeholderTextColor={colors.textTertiary}
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showSecrets}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {selectedExchangeId === 'kraken' ? 'Private Key' : 'API Secret'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter your ${exchangeInfo.name} ${selectedExchangeId === 'kraken' ? 'private key' : 'API secret'}`}
              placeholderTextColor={colors.textTertiary}
              value={apiSecret}
              onChangeText={setApiSecret}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showSecrets}
            />
          </View>

          <TouchableOpacity
            style={styles.showButton}
            onPress={() => setShowSecrets(!showSecrets)}
          >
            <Text style={styles.showButtonText}>
              {showSecrets ? 'Hide' : 'Show'} Keys
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSaveKeys}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.cardBackground} />
            ) : (
              <Text style={styles.saveButtonText}>Save Keys</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.manualCard}
        onPress={() => Linking.openURL('https://www.mybitcoindca.com/manual')}
        activeOpacity={0.7}
      >
        <View style={styles.manualContent}>
          <Ionicons name="book-outline" size={24} color={colors.primary} />
          <View style={styles.manualTextContainer}>
            <Text style={styles.manualTitle}>The Manual</Text>
            <Text style={styles.manualSubtitle}>
              A Step-by-step setup guide
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 App Withdrawal Mode</Text>
        <Text style={styles.infoText}>
          • Turn OFF App Withdrawal Mode in Settings to avoid granting withdrawal permissions to your API keys
        </Text>
        <Text style={styles.infoText}>
          • With App Withdrawal Mode OFF: Do NOT enable withdrawal permissions in {exchangeInfo.name} API settings
        </Text>
        <Text style={styles.infoText}>
          • You'll receive withdrawal instructions with copy buttons instead of automatic execution
        </Text>
        <Text style={styles.infoText}>
          • This provides extra security by keeping withdrawal permissions completely disabled on your API keys
        </Text>
      </View>

      {selectedExchangeId === 'kraken' && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>📝 {withdrawalNotes.title}</Text>
          {withdrawalNotes.notes.map((note, index) => (
            <Text key={index} style={styles.warningText}>• {note}</Text>
          ))}
        </View>
      )}

      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>(Quick guide) How to get your {exchangeInfo.name} API keys:</Text>
        {instructions.map((instruction, index) => (
          <Text key={index} style={styles.instructionsText}>{instruction}</Text>
        ))}
      </View>

      <TouchableOpacity
        style={styles.linkCard}
        onPress={() => Linking.openURL(exchangeInfo.apiDocsUrl)}
        activeOpacity={0.7}
      >
        <View style={styles.linkContent}>
          <Ionicons name="key-outline" size={24} color={colors.primary} />
          <View style={styles.linkTextContainer}>
            <Text style={styles.linkTitle}>Open {exchangeInfo.name} API Settings</Text>
            <Text style={styles.linkSubtitle}>
              Create or manage your API keys
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  exchangeSelector: {
    padding: 20,
    paddingBottom: 0,
  },
  exchangeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  noExchangesCard: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  noExchangesText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  exchangeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  exchangeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  exchangeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exchangeButtonTextActive: {
    color: colors.primary,
  },
  exchangeButtonDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  exchangeButtonDescActive: {
    color: colors.primary,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0D47A1',
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    marginBottom: 4,
  },
  disclaimerCard: {
    backgroundColor: '#FFF3CD',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#856404',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  warningCard: {
    backgroundColor: '#FCE4EC',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F8BBD9',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#880E4F',
  },
  warningText: {
    fontSize: 14,
    color: '#AD1457',
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.cardBackground,
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.text,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  showButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  showButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.cardBackground,
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  testButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.error,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  instructionsCard: {
    backgroundColor: colors.cardBackground,
    marginRight: 20,
    marginLeft: 20,
    marginTop: 10,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.text,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  manualCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  manualContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  manualSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  linkCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
