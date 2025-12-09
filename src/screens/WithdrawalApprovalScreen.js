import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { executeWithdrawal, getWithdrawalFee } from '../services/binanceService';
import { dcaAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function WithdrawalApprovalScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { withdrawalData } = route.params;
  const [loading, setLoading] = useState(false);
  const [networkFee, setNetworkFee] = useState(0);
  const [loadingFee, setLoadingFee] = useState(true);

  useEffect(() => {
    fetchNetworkFee();
  }, []);

  const fetchNetworkFee = async () => {
    try {
      const fee = await getWithdrawalFee();
      setNetworkFee(fee);
    } catch (error) {
      console.error('Error fetching fee:', error);
      setNetworkFee(0.0005); // Fallback
    } finally {
      setLoadingFee(false);
    }
  };

  const handleApprove = async () => {
    Alert.alert(
      'Confirm Withdrawal',
      `Are you sure you want to withdraw ${withdrawalData.btcAmount} BTC to your hardware wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'destructive',
          onPress: executeWithdrawalAction,
        },
      ]
    );
  };

  const executeWithdrawalAction = async () => {
    setLoading(true);
    try {
      const result = await executeWithdrawal(
        withdrawalData.address,
        withdrawalData.btcAmount,
        'BTC'
      );

      if (result.success) {
        // Report the withdrawal to the server
        try {
          await dcaAPI.reportWithdrawal({
            txId: result.data?.id || null,
            amount: withdrawalData.btcAmount,
            fee: networkFee,
            address: withdrawalData.address,
            timestamp: new Date().toISOString(),
          });
        } catch (reportError) {
          console.error('Failed to report withdrawal to server:', reportError);
          // Continue even if reporting fails - withdrawal was successful
        }

        Alert.alert(
          'Success',
          'Withdrawal executed successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Withdrawal failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to execute withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Withdrawal',
      'Are you sure you want to reject this withdrawal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Rejected', 'Withdrawal has been rejected');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Withdrawal Request</Text>
        <Text style={styles.subtitle}>Review transaction to YOUR wallet</Text>
      </View>

      <View style={styles.userControlCard}>
        <Text style={styles.userControlTitle}>👤 You Control This Withdrawal</Text>
        <Text style={styles.userControlText}>
          This withdrawal will be executed directly from YOUR Binance account to YOUR specified Bitcoin wallet address. We do NOT control or custody these funds.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transaction Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Amount (EUR)</Text>
          <Text style={styles.value}>€{withdrawalData.eurAmount?.toFixed(2) || 'N/A'}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.detailRow}>
          <Text style={styles.label}>Amount (BTC)</Text>
          <Text style={[styles.value, styles.highlight]}>{withdrawalData.btcAmount} BTC</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.detailRow}>
          <Text style={styles.label}>Network Fee</Text>
          {loadingFee ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={styles.value}>{networkFee} BTC</Text>
          )}
        </View>

        <View style={styles.separator} />

        <View style={styles.detailRow}>
          <Text style={styles.label}>You Will Receive</Text>
          <Text style={[styles.value, styles.highlight]}>
            {(withdrawalData.btcAmount - networkFee).toFixed(8)} BTC
          </Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.detailRow}>
          <Text style={styles.label}>Network</Text>
          <Text style={styles.value}>Bitcoin (BTC)</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.addressContainer}>
          <Text style={styles.label}>Your Destination Wallet Address</Text>
          <Text style={styles.addressNote}>
            Ensure this is YOUR wallet address that YOU control:
          </Text>
          <Text style={styles.address}>{withdrawalData.address}</Text>
        </View>
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>⚠️ Important - Verify Before Approving</Text>
        <Text style={styles.warningText}>
          • This withdrawal executes on YOUR Binance account
        </Text>
        <Text style={styles.warningText}>
          • Funds go directly to YOUR specified wallet address
        </Text>
        <Text style={styles.warningText}>
          • Double-check the destination address (case-sensitive)
        </Text>
        <Text style={styles.warningText}>
          • Bitcoin transactions are IRREVERSIBLE once confirmed
        </Text>
        <Text style={styles.warningText}>
          • Network fees are paid to Bitcoin miners (not to us)
        </Text>
        <Text style={styles.warningText}>
          • We do NOT hold, custody, or control your funds
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton]}
          onPress={handleReject}
          disabled={loading}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.approveButton, loading && styles.buttonDisabled]}
          onPress={handleApprove}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.cardBackground} />
          ) : (
            <Text style={styles.approveButtonText}>Approve Withdrawal</Text>
          )}
        </TouchableOpacity>
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
  card: {
    backgroundColor: colors.cardBackground,
    margin: 20,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  highlight: {
    color: colors.primary,
    fontSize: 18,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  addressContainer: {
    paddingTop: 12,
  },
  addressNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  address: {
    fontSize: 12,
    color: colors.text,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  userControlCard: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  userControlTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 8,
  },
  userControlText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#856404',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  actions: {
    padding: 20,
    paddingTop: 0,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  rejectButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.error,
  },
  rejectButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  approveButtonText: {
    color: colors.cardBackground,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
