import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import storage from '../utils/storage';

export default function DisclaimerScreen({ onAccept }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await storage.setItem('disclaimer_accepted', 'true');
      onAccept();
    } catch (error) {
      console.error('Error saving disclaimer acceptance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isCloseToBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Important Disclosures</Text>
        <Text style={styles.headerSubtitle}>Please read carefully before continuing</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {/* Not an Exchange */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 This App is NOT an Exchange</Text>
          <Text style={styles.sectionText}>
            This application is a <Text style={styles.bold}>third-party client interface</Text> for Binance.com.
            We are NOT:
          </Text>
          <Text style={styles.bulletPoint}>• A cryptocurrency exchange</Text>
          <Text style={styles.bulletPoint}>• A broker or financial intermediary</Text>
          <Text style={styles.bulletPoint}>• A custodian of your funds</Text>
          <Text style={styles.sectionText}>
            All trades and withdrawals are executed directly on your Binance account using Binance's services.
          </Text>
        </View>

        {/* User Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 You Control Your Funds</Text>
          <Text style={styles.sectionText}>
            This app acts solely as a convenient interface to execute trades and withdrawals on <Text style={styles.bold}>YOUR</Text> Binance account.
          </Text>
          <Text style={styles.bulletPoint}>• You maintain full control of your Binance account</Text>
          <Text style={styles.bulletPoint}>• All funds remain in YOUR Binance account</Text>
          <Text style={styles.bulletPoint}>• We NEVER hold, custody, or control your funds</Text>
          <Text style={styles.bulletPoint}>• Withdrawals go directly to YOUR specified wallet address</Text>
        </View>

        {/* API Keys Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 API Keys Stored Only on Your Device</Text>
          <Text style={styles.sectionText}>
            Your Binance API keys are stored <Text style={styles.bold}>exclusively on your device</Text> using iOS Keychain encryption (Secure Enclave):
          </Text>
          <Text style={styles.bulletPoint}>• Keys are encrypted using iOS Keychain</Text>
          <Text style={styles.bulletPoint}>• Keys NEVER leave your device</Text>
          <Text style={styles.bulletPoint}>• Keys are NEVER sent to our servers</Text>
          <Text style={styles.bulletPoint}>• Keys are NEVER logged or transmitted to third parties</Text>
          <Text style={styles.bulletPoint}>• You can revoke or delete keys at any time in Settings</Text>
          <Text style={styles.sectionText}>
            All API calls to Binance are made directly from your device to Binance's servers.
          </Text>
        </View>

        {/* User Initiation Required */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✋ Manual Approval Required</Text>
          <Text style={styles.sectionText}>
            Every trade and withdrawal requires <Text style={styles.bold}>explicit manual approval</Text> from you:
          </Text>
          <Text style={styles.bulletPoint}>• No automatic or background transactions</Text>
          <Text style={styles.bulletPoint}>• You must review and confirm every action</Text>
          <Text style={styles.bulletPoint}>• Full transparency of amounts, fees, and destinations</Text>
          <Text style={styles.bulletPoint}>• You can cancel any transaction before approval</Text>
        </View>

        {/* Trading Risks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Trading Involves Risk</Text>
          <Text style={styles.sectionText}>
            Cryptocurrency trading carries substantial risk:
          </Text>
          <Text style={styles.bulletPoint}>• You may lose some or all of your invested capital</Text>
          <Text style={styles.bulletPoint}>• Cryptocurrency prices are highly volatile</Text>
          <Text style={styles.bulletPoint}>• Past performance does not guarantee future results</Text>
          <Text style={styles.bulletPoint}>• Market conditions can change rapidly</Text>
          <Text style={styles.bulletPoint}>• Network fees apply to withdrawals (paid to miners, not to us)</Text>
        </View>

        {/* No Guarantees */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 No Guarantees or Financial Advice</Text>
          <Text style={styles.sectionText}>
            We make <Text style={styles.bold}>NO guarantees</Text> about:
          </Text>
          <Text style={styles.bulletPoint}>• Profit or investment returns</Text>
          <Text style={styles.bulletPoint}>• Execution prices or timing</Text>
          <Text style={styles.bulletPoint}>• Availability of Binance services</Text>
          <Text style={styles.bulletPoint}>• Network conditions or fees</Text>
          <Text style={styles.sectionText}>
            This app does NOT provide financial, investment, or trading advice. Consult a licensed financial advisor before making investment decisions.
          </Text>
        </View>

        {/* Your Responsibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Your Responsibility</Text>
          <Text style={styles.bulletPoint}>• Verify all transaction details before approval</Text>
          <Text style={styles.bulletPoint}>• Double-check wallet addresses (irreversible)</Text>
          <Text style={styles.bulletPoint}>• Understand the risks before trading</Text>
          <Text style={styles.bulletPoint}>• Keep your Binance account secure</Text>
          <Text style={styles.bulletPoint}>• Monitor your account for unauthorized activity</Text>
          <Text style={styles.bulletPoint}>• Comply with your local tax and regulatory requirements</Text>
        </View>

        {/* Binance ToS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Binance Terms Apply</Text>
          <Text style={styles.sectionText}>
            By using this app, you acknowledge that you have a Binance account and agree to Binance's Terms of Service.
            All trades and withdrawals are subject to Binance's policies, fees, and limitations.
          </Text>
        </View>

        <View style={styles.finalNote}>
          <Text style={styles.finalNoteText}>
            By tapping "I Accept" below, you acknowledge that you have read, understood, and agree to these disclosures.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!scrolledToBottom && (
          <Text style={styles.scrollPrompt}>↓ Please scroll to bottom to continue ↓</Text>
        )}
        <TouchableOpacity
          style={[
            styles.acceptButton,
            !scrolledToBottom && styles.acceptButtonDisabled,
            loading && styles.acceptButtonDisabled,
          ]}
          onPress={handleAccept}
          disabled={!scrolledToBottom || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.cardBackground} />
          ) : (
            <Text style={styles.acceptButtonText}>I Accept - Continue to App</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  finalNote: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
    marginTop: 8,
  },
  finalNoteText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scrollPrompt: {
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: colors.success,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.4,
  },
  acceptButtonText: {
    color: colors.cardBackground,
    fontSize: 18,
    fontWeight: '700',
  },
});