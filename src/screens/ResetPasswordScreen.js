import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function ResetPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const { verifyResetToken, resetPassword } = useAuth();

  const validatePassword = (pass) => {
    const requirements = {
      length: pass.length >= 12,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    };

    return {
      isValid: Object.values(requirements).every(req => req),
      requirements,
    };
  };

  const handleVerifyToken = async () => {
    if (!token) {
      Alert.alert('Error', 'Please enter the reset code from your email');
      return;
    }

    setVerifying(true);
    const result = await verifyResetToken(token);
    setVerifying(false);

    if (result.success) {
      setTokenVerified(true);
      Alert.alert('Success', 'Reset code verified. Now enter your new password.');
    } else {
      Alert.alert('Invalid Code', result.message || 'The reset code is invalid or expired.');
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const { isValid, requirements } = validatePassword(password);
    if (!isValid) {
      let message = 'Password must contain:\n';
      if (!requirements.length) message += '- At least 12 characters\n';
      if (!requirements.uppercase) message += '- One uppercase letter\n';
      if (!requirements.lowercase) message += '- One lowercase letter\n';
      if (!requirements.number) message += '- One number\n';
      if (!requirements.special) message += '- One special character\n';

      Alert.alert('Weak Password', message);
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Password Reset',
        'Your password has been successfully reset. You can now login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.message || 'Failed to reset password');
    }
  };

  const passwordValidation = validatePassword(password);
  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {tokenVerified
              ? 'Enter your new password'
              : 'Enter the reset code from your email'}
          </Text>

          <View style={styles.form}>
            {!tokenVerified ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Reset Code"
                  placeholderTextColor={colors.textTertiary}
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  editable={!verifying}
                />

                <TouchableOpacity
                  style={[styles.button, verifying && styles.buttonDisabled]}
                  onPress={handleVerifyToken}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.tokenVerified}>
                  <Text style={styles.tokenVerifiedText}>✓ Reset code verified</Text>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor={colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!loading}
                />

                {password.length > 0 && (
                  <View style={styles.passwordRequirements}>
                    <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                    <Text style={[styles.requirement, passwordValidation.requirements.length && styles.requirementMet]}>
                      {passwordValidation.requirements.length ? '✓' : '○'} At least 12 characters
                    </Text>
                    <Text style={[styles.requirement, passwordValidation.requirements.uppercase && styles.requirementMet]}>
                      {passwordValidation.requirements.uppercase ? '✓' : '○'} One uppercase letter
                    </Text>
                    <Text style={[styles.requirement, passwordValidation.requirements.lowercase && styles.requirementMet]}>
                      {passwordValidation.requirements.lowercase ? '✓' : '○'} One lowercase letter
                    </Text>
                    <Text style={[styles.requirement, passwordValidation.requirements.number && styles.requirementMet]}>
                      {passwordValidation.requirements.number ? '✓' : '○'} One number
                    </Text>
                    <Text style={[styles.requirement, passwordValidation.requirements.special && styles.requirementMet]}>
                      {passwordValidation.requirements.special ? '✓' : '○'} One special character
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading || verifying}>
              <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  tokenVerified: {
    backgroundColor: colors.success || '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  tokenVerifiedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  passwordRequirements: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  requirementMet: {
    color: colors.success || '#4CAF50',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  link: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
