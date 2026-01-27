import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Clipboard,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { executeWithdrawal, getWithdrawalFee, getSelectedExchange, getExchangeInfo } from '../services/exchangeService';
import { dcaAPI, authAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function WithdrawalApprovalScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?._id;
  const { withdrawalData } = route.params;
  const [loading, setLoading] = useState(false);
  const [networkFee, setNetworkFee] = useState(0);
  const [loadingFee, setLoadingFee] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [exchange, setExchange] = useState('binance');
  const [exchangeName, setExchangeName] = useState('your exchange');

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'approve' or 'manual'

  useEffect(() => {
    loadExchangeInfo();
    fetch2FAStatus();
    // Use appWithdrawal from notification data if available
    if (withdrawalData.appWithdrawal !== undefined) {
      // appWithdrawal: true = app mode, false = manual mode
      setManualMode(!withdrawalData.appWithdrawal);
      setLoadingSettings(false);
    } else {
      // Fallback to fetching settings if not in notification data (backwards compatibility)
      fetchSettings();
    }
  }, []);

  const loadExchangeInfo = async () => {
    try {
      const selectedExchange = await getSelectedExchange(userId);
      setExchange(selectedExchange);
      const info = getExchangeInfo(selectedExchange);
      setExchangeName(info?.name || 'your exchange');
      // Now fetch network fee with the correct exchange
      await fetchNetworkFee(selectedExchange);
    } catch (error) {
      await fetchNetworkFee('binance');
    }
  };

  const fetch2FAStatus = async () => {
    try {
      const response = await authAPI.get2FAStatus();
      if (response.success) {
        setTwoFactorEnabled(response.data.enabled);
      }
    } catch (error) {
      // 2FA status check failed - assume disabled
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await authAPI.getSettings();
      if (response.success) {
        // appWithdrawal: true = app mode, false = manual mode
        const appWithdrawal = response.data.settings.appWithdrawal ?? true;
        setManualMode(!appWithdrawal);
      }
    } catch (error) {
      // Use default settings
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchNetworkFee = async (exchangeId = 'binance') => {
    try {
      const fee = await getWithdrawalFee(exchangeId, userId);
      setNetworkFee(fee);
    } catch (error) {
      setNetworkFee(0.0005); // Fallback
    } finally {
      setLoadingFee(false);
    }
  };

  const handleApprove = async () => {
    if (twoFactorEnabled) {
      // Show 2FA verification modal before proceeding
      setPendingAction('approve');
      setTwoFactorCode('');
      setShow2FAModal(true);
    } else {
      // No 2FA, proceed with confirmation
      showApprovalConfirmation();
    }
  };

  const showApprovalConfirmation = () => {
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

  const handle2FAVerification = async () => {
    if (twoFactorCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code.');
      return;
    }

    setVerifying2FA(true);
    try {
      const response = await authAPI.verify2FA(twoFactorCode);
      if (response.success) {
        setShow2FAModal(false);
        setTwoFactorCode('');

        // Proceed with the pending action
        if (pendingAction === 'approve') {
          showApprovalConfirmation();
        } else if (pendingAction === 'manual') {
          handleManualWithdrawalDoneAction();
        }
        setPendingAction(null);
      } else {
        Alert.alert('Error', response.message || 'Invalid verification code.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleClose2FAModal = () => {
    setShow2FAModal(false);
    setTwoFactorCode('');
    setPendingAction(null);
  };

  const executeWithdrawalAction = async () => {
    setLoading(true);
    try {
      const result = await executeWithdrawal(
        exchange,
        withdrawalData.address,
        withdrawalData.btcAmount,
        'BTC',
        userId
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

  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const handleManualWithdrawalDone = async () => {
    if (twoFactorEnabled) {
      // Show 2FA verification modal before proceeding
      setPendingAction('manual');
      setTwoFactorCode('');
      setShow2FAModal(true);
    } else {
      // No 2FA, proceed directly
      handleManualWithdrawalDoneAction();
    }
  };

  const handleManualWithdrawalDoneAction = async () => {
    setLoading(true);
    try {
      // Report the manual withdrawal to the server for tracking
      await dcaAPI.reportWithdrawal({
        txId: null, // No txId for manual withdrawals
        amount: withdrawalData.btcAmount,
        fee: networkFee,
        address: withdrawalData.address,
        timestamp: new Date().toISOString(),
        manual: true, // Flag to indicate this was a manual withdrawal
      });

      Alert.alert(
        'Withdrawal Recorded',
        `Please complete the withdrawal in ${exchangeName}. The withdrawal has been recorded in your dashboard. Once confirmed on the blockchain, you can track it in your transaction history.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      // Still allow user to proceed even if reporting fails
      Alert.alert(
        'Withdrawal Initiated',
        `Please complete the withdrawal in ${exchangeName}. Note: This withdrawal may not appear in your dashboard statistics.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  if (loadingSettings) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Withdrawal Request</Text>
        <Text style={styles.subtitle}>
          {manualMode ? 'Manual withdrawal instructions' : 'Review transaction to YOUR wallet'}
        </Text>
      </View>

      {manualMode ? (
        <View style={styles.manualModeCard}>
          <Text style={styles.manualModeTitle}>📋 Manual Withdrawal Instructions</Text>
          <Text style={styles.manualModeText}>
            Copy the details below and complete the withdrawal in {exchangeName} manually.
          </Text>
        </View>
      ) : (
        <View style={styles.userControlCard}>
          <Text style={styles.userControlTitle}>👤 You Control This Withdrawal</Text>
          <Text style={styles.userControlText}>
            This withdrawal will be executed directly from YOUR {exchangeName} account to YOUR specified Bitcoin wallet address. We do NOT control or custody these funds.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transaction Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Amount (EUR)</Text>
          <Text style={styles.value}>€{withdrawalData.eurAmount?.toFixed(2) || 'N/A'}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.detailRow}>
          <Text style={styles.label}>Amount (BTC)</Text>
          {manualMode ? (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(withdrawalData.btcAmount.toString(), 'Amount')}
            >
              <Text style={[styles.value, styles.highlight]}>{withdrawalData.btcAmount} BTC</Text>
              <Ionicons name="copy-outline" size={20} color={colors.primary} style={styles.copyIcon} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.value, styles.highlight]}>{withdrawalData.btcAmount} BTC</Text>
          )}
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
          {manualMode ? (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard('BTC', 'Network')}
            >
              <Text style={styles.value}>Bitcoin (BTC)</Text>
              <Ionicons name="copy-outline" size={20} color={colors.primary} style={styles.copyIcon} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.value}>Bitcoin (BTC)</Text>
          )}
        </View>

        <View style={styles.separator} />

        <View style={styles.addressContainer}>
          <Text style={styles.label}>Your Destination Wallet Address</Text>
          <Text style={styles.addressNote}>
            Ensure this is YOUR wallet address that YOU control:
          </Text>
          <View style={styles.addressWrapper}>
            <Text style={styles.address}>{withdrawalData.address}</Text>
            {manualMode && (
              <TouchableOpacity
                style={styles.addressCopyButton}
                onPress={() => copyToClipboard(withdrawalData.address, 'Address')}
              >
                <Ionicons name="copy-outline" size={24} color={colors.primary} />
                <Text style={styles.copyButtonText}>Copy Address</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {manualMode ? (
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📖 Steps to Complete</Text>
          <Text style={styles.instructionsText}>
            1. Open the {exchangeName} app or website
          </Text>
          <Text style={styles.instructionsText}>
            2. Go to your Wallet → Withdraw
          </Text>
          <Text style={styles.instructionsText}>
            3. Select Bitcoin (BTC)
          </Text>
          <Text style={styles.instructionsText}>
            4. Paste the address and amount using the copy buttons above
          </Text>
          <Text style={styles.instructionsText}>
            5. Select Network: Bitcoin (BTC)
          </Text>
          <Text style={styles.instructionsText}>
            6. Review and confirm the withdrawal in {exchangeName}
          </Text>
        </View>
      ) : (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Important - Verify Before Approving</Text>
          <Text style={styles.warningText}>
            • This withdrawal executes on YOUR {exchangeName} account
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
      )}

      <View style={styles.actions}>
        {manualMode ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.rejectButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.approveButton, loading && styles.buttonDisabled]}
              onPress={handleManualWithdrawalDone}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.cardBackground} />
              ) : (
                <Text style={styles.approveButtonText}>Done</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
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
          </>
        )}
      </View>

      {/* 2FA Verification Modal */}
      <Modal
        visible={show2FAModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose2FAModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>2FA Verification</Text>
              <TouchableOpacity onPress={handleClose2FAModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIconContainer}>
              <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
            </View>

            <Text style={styles.modalDescription}>
              Enter the 6-digit code from your authenticator app to proceed with this withdrawal.
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
              autoFocus={true}
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
                  verifying2FA && styles.modalButtonDisabled,
                ]}
                onPress={handle2FAVerification}
                disabled={verifying2FA}
              >
                {verifying2FA ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  manualModeCard: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  manualModeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 8,
  },
  manualModeText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyIcon: {
    marginLeft: 8,
  },
  addressWrapper: {
    position: 'relative',
  },
  addressCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructionsCard: {
    backgroundColor: '#FFF3CD',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#856404',
  },
  instructionsText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
    lineHeight: 20,
  },
  // 2FA Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  codeInput: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    letterSpacing: 12,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
});

WithdrawalApprovalScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      withdrawalData: PropTypes.shape({
        eurAmount: PropTypes.number,
        btcAmount: PropTypes.number.isRequired,
        address: PropTypes.string.isRequired,
        requestId: PropTypes.string,
        appWithdrawal: PropTypes.bool,
        userId: PropTypes.string,
      }).isRequired,
    }).isRequired,
  }).isRequired,
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};
