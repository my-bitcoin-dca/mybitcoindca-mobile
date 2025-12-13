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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);

    if (result.success) {
      setSent(true);
      Alert.alert(
        'Email Sent',
        'If an account exists with this email, you will receive password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ResetPassword'),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.message || 'Failed to send reset email');
    }
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you instructions to reset your password.
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading && !sent}
          />

          <TouchableOpacity
            style={[styles.button, (loading || sent) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || sent}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {sent ? 'Email Sent' : 'Send Reset Link'}
              </Text>
            )}
          </TouchableOpacity>

          {sent && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('ResetPassword')}
            >
              <Text style={styles.secondaryButtonText}>I have a reset code</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
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
