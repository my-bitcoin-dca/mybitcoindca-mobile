import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function PasscodeScreen({ route }) {
  const { colors } = useTheme();
  const { mode = 'unlock' } = route?.params || {}; // 'unlock' or 'setup'
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [step, setStep] = useState(mode === 'setup' ? 'enter' : 'unlock');
  const { unlockWithPasscode, setPasscode: savePasscode } = useAuth();

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
    await savePasscode(code);
    // Unlock the app after setting up passcode
    await unlockWithPasscode(code);
    Alert.alert('Success', 'Passcode set successfully');
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
    return 'Confirm Passcode';
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.subtitle}>
        {step === 'unlock'
          ? 'Enter your 6-digit passcode to continue'
          : 'Create a 6-digit passcode to secure your app'}
      </Text>

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
});
