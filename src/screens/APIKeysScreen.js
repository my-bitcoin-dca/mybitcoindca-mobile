import React, { useState, useEffect } from 'react';
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
  storeBinanceKeys,
  hasBinanceKeys,
  deleteBinanceKeys,
  getAccountBalances,
} from '../services/binanceService';
import { useTheme } from '../contexts/ThemeContext';

export default function APIKeysScreen({ navigation }) {
  const { colors } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [hasKeys, setHasKeys] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    checkKeys();
  }, []);

  const checkKeys = async () => {
    const exists = await hasBinanceKeys();
    setHasKeys(exists);
  };

  const handleSaveKeys = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      Alert.alert('Error', 'Please enter both API key and secret');
      return;
    }

    setLoading(true);
    try {
      await storeBinanceKeys(apiKey.trim(), apiSecret.trim());
      setHasKeys(true);
      setApiKey('');
      setApiSecret('');
      Alert.alert('Success', 'Binance API keys saved securely on your device');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleTestKeys = async () => {
    setTesting(true);
    try {
      const result = await getAccountBalances();
      if (result.success) {
        Alert.alert(
          'Success',
          'API keys are valid! Connected to Binance successfully.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Invalid API keys or connection failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test API keys');
    } finally {
      setTesting(false);
    }
  };

  const handleDeleteKeys = () => {
    Alert.alert(
      'Delete API Keys',
      'Are you sure you want to delete your Binance API keys? You will need to re-enter them to approve withdrawals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBinanceKeys();
            setHasKeys(false);
            Alert.alert('Deleted', 'API keys have been removed');
          },
        },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Binance API Keys</Text>
        <Text style={styles.subtitle}>
          Securely store your Binance API keys on YOUR device
        </Text>
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
          • Trades execute directly on YOUR Binance account
        </Text>
      </View>

      {hasKeys ? (
        <View style={styles.card}>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>API Keys Configured</Text>
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
          <Text style={styles.cardTitle}>Enter Your Binance API Keys</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your Binance API key"
              placeholderTextColor={colors.textTertiary}
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showSecrets}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>API Secret</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your Binance API secret"
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
          • With App Withdrawal Mode OFF: Do NOT enable "Enable Withdrawals" in Binance API settings
        </Text>
        <Text style={styles.infoText}>
          • You'll receive withdrawal instructions with copy buttons instead of automatic execution
        </Text>
        <Text style={styles.infoText}>
          • This provides extra security by keeping withdrawal permissions completely disabled on your API keys
        </Text>
      </View>

      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>(Quick guide) How to get your API keys:</Text>
        <Text style={styles.instructionsText}>
          1. Log in to Binance.com
        </Text>
        <Text style={styles.instructionsText}>
          2. Go to Profile → API Management
        </Text>
        <Text style={styles.instructionsText}>
          3. Create a new API key
        </Text>
        <Text style={styles.instructionsText}>
          4. Enable "Enable Spot & Margin Trading" (required)
        </Text>
        <Text style={styles.instructionsText}>
          5. Enable "Enable Withdrawals" ONLY if App Withdrawal Mode is ON
        </Text>
        <Text style={styles.instructionsText}>
          6. Do NOT enable "Enable Withdrawals" if App Withdrawal Mode is OFF
        </Text>
        <Text style={styles.instructionsText}>
          7. Whitelist a dedicated IP (recommended: use a VPN service with a static IP)
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginTop: 0,
    marginBottom: 40,
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
});
