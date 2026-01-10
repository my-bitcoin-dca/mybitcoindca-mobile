import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function PasscodeScreen({ route }) {
  const { colors } = useTheme();
  const { mode = 'unlock' } = route?.params || {}; // 'unlock' or 'setup'
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [step, setStep] = useState(mode === 'setup' ? 'enter' : 'unlock');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {
    unlockWithPasscode,
    setPasscode: savePasscode,
    requestPasscodeReset,
    confirmPasscodeReset,
  } = useAuth();

  const handleNumberPress = (num) => {
    if (step === 'unlock' && passcode.length < 6) {
      const newPasscode = passcode + num;
      setPasscode(newPasscode);

      if (newPasscode.length === 6) {
        verifyPasscode(newPasscode);
      }
    } else if (step === 'enter' && passcode.length < 6) {
      setPasscode(passcode + num);
    } else if (step === 'confirm' && confirmPasscode.length < 6) {
      const newConfirm = confirmPasscode + num;
      setConfirmPasscode(newConfirm);

      if (newConfirm.length === 6) {
        if (newConfirm === passcode) {
          saveNewPasscode(passcode);
        } else {
          Vibration.vibrate();
          Alert.alert('Error', 'Passcodes do not match');
          setPasscode('');
          setConfirmPasscode('');
          setStep('enter');
        }
      }
    }
  };

  const verifyPasscode = async (code) => {
    const success = await unlockWithPasscode(code);
    if (!success) {
      Vibration.vibrate();
      Alert.alert('Error', 'Incorrect passcode');
      setPasscode('');
    }
  };

  const saveNewPasscode = async (code) => {
    setIsLoading(true);
    const success = await savePasscode(code);
    setIsLoading(false);
    if (success) {
      // Unlock the app after setting up passcode
      await unlockWithPasscode(code);
      Alert.alert('Success', 'Passcode set successfully');
    } else {
      Alert.alert('Error', 'Failed to set passcode. Please try again.');
      setPasscode('');
      setConfirmPasscode('');
      setStep('enter');
    }
  };

  const handleForgotPasscode = async () => {
    setIsLoading(true);
    const result = await requestPasscodeReset();
    setIsLoading(false);
    if (result.success) {
      Alert.alert(
        'Reset Email Sent',
        'Check your email for a reset code. Enter it below to reset your passcode.',
        [{ text: 'OK', onPress: () => setStep('reset_enter_token') }]
      );
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleResetConfirm = async () => {
    if (!resetToken.trim()) {
      Alert.alert('Error', 'Please enter the reset code from your email');
      return;
    }
    if (passcode.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit passcode');
      return;
    }
    if (passcode !== confirmPasscode) {
      Alert.alert('Error', 'Passcodes do not match');
      setPasscode('');
      setConfirmPasscode('');
      return;
    }

    setIsLoading(true);
    const result = await confirmPasscodeReset(resetToken.trim(), passcode);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Passcode has been reset!', [
        {
          text: 'OK',
          onPress: () => {
            setStep('unlock');
            setPasscode('');
            setConfirmPasscode('');
            setResetToken('');
          },
        },
      ]);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleBackToUnlock = () => {
    setStep('unlock');
    setPasscode('');
    setConfirmPasscode('');
    setResetToken('');
  };

  const handleDelete = () => {
    if (step === 'unlock' || step === 'enter') {
      setPasscode(passcode.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPasscode(confirmPasscode.slice(0, -1));
    }
  };

  const handleContinue = () => {
    if (passcode.length === 6 && step === 'enter') {
      setStep('confirm');
    }
  };

  const getCurrentPasscode = () => {
    if (step === 'confirm') return confirmPasscode;
    return passcode;
  };

  const getTitle = () => {
    if (step === 'unlock') return 'Enter Passcode';
    if (step === 'enter') return 'Create Passcode';
    if (step === 'confirm') return 'Confirm Passcode';
    if (step === 'reset_enter_token') return 'Reset Passcode';
    return 'Confirm Passcode';
  };

  const getSubtitle = () => {
    if (step === 'unlock') return 'Enter your 6-digit passcode to continue';
    if (step === 'enter') return 'Create a 6-digit passcode to secure your app';
    if (step === 'confirm') return 'Re-enter your passcode to confirm';
    if (step === 'reset_enter_token') return 'Enter the reset code from your email and create a new passcode';
    return '';
  };

  const styles = createStyles(colors);

  // Show loading overlay
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Please wait...</Text>
      </View>
    );
  }

  // Reset passcode flow UI
  if (step === 'reset_enter_token') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.resetContainer}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reset Code (from email)</Text>
            <TextInput
              style={styles.input}
              value={resetToken}
              onChangeText={setResetToken}
              placeholder="Paste reset code here"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Passcode (6 digits)</Text>
            <TextInput
              style={styles.input}
              value={passcode}
              onChangeText={(text) => setPasscode(text.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="Enter 6-digit passcode"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Passcode</Text>
            <TextInput
              style={styles.input}
              value={confirmPasscode}
              onChangeText={(text) => setConfirmPasscode(text.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="Re-enter 6-digit passcode"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
          </View>

          <TouchableOpacity style={styles.continueButton} onPress={handleResetConfirm}>
            <Text style={styles.continueButtonText}>Reset Passcode</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleBackToUnlock}>
            <Text style={styles.backButtonText}>Back to Unlock</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.subtitle}>{getSubtitle()}</Text>

      <View style={styles.dotsContainer}>
        {[...Array(6)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < getCurrentPasscode().length && styles.dotFilled,
            ]}
          />
        ))}
      </View>

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.key}
            onPress={() => handleNumberPress(num.toString())}
          >
            <Text style={styles.keyText}>{num}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.key} />

        <TouchableOpacity
          style={styles.key}
          onPress={() => handleNumberPress('0')}
        >
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.key} onPress={handleDelete}>
          <Text style={styles.keyText}>⌫</Text>
        </TouchableOpacity>
      </View>

      {step === 'enter' && passcode.length === 6 && (
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      )}

      {step === 'unlock' && (
        <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPasscode}>
          <Text style={styles.forgotButtonText}>Forgot Passcode?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
    color: colors.textSecondary,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 60,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    marginHorizontal: 8,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },
  key: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  keyText: {
    fontSize: 32,
    color: colors.text,
  },
  continueButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.cardBackground,
    fontSize: 18,
    fontWeight: '600',
  },
  forgotButton: {
    marginTop: 30,
    alignItems: 'center',
  },
  forgotButtonText: {
    color: colors.primary,
    fontSize: 16,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 16,
  },
  resetContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border || colors.textSecondary + '30',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
