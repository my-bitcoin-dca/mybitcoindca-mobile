import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { surveyAPI } from '../services/api';

const SURVEY_OPTIONS = [
  {
    id: 'no_exchange_account',
    label: "I haven't set up a Binance/Kraken account yet",
    redirectTo: null,
  },
  {
    id: 'api_keys_complicated',
    label: 'The API key setup seems complicated',
    redirectTo: 'https://mybitcoindca.com/manual',
  },
  {
    id: 'security_concerns',
    label: "I'm concerned about security",
    redirectTo: 'https://mybitcoindca.com/security',
  },
  {
    id: 'no_funds_deposited',
    label: "I haven't deposited funds yet",
    redirectTo: null,
  },
  {
    id: 'still_learning',
    label: "I'm still learning about the app",
    redirectTo: null,
  },
  {
    id: 'other',
    label: 'Other',
    redirectTo: null,
  },
];

export default function SurveyModal({ visible, onClose }) {
  const { colors } = useTheme();
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = createStyles(colors);

  const handleSubmit = async () => {
    if (!selectedOption) return;

    setSubmitting(true);
    try {
      const response = await surveyAPI.submit(selectedOption.id, feedback.trim());

      if (response.success && response.redirectTo) {
        // Open the help page
        Linking.openURL(response.redirectTo);
      }

      onClose();
    } catch (error) {
      console.error('[Survey] Error submitting:', error);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await surveyAPI.dismiss();
    } catch (error) {
      console.error('[Survey] Error dismissing:', error);
    }
    onClose();
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.title}>Quick Question</Text>
              <Text style={styles.subtitle}>
                Help us understand how we can help you get started
              </Text>
            </View>

            {/* Question */}
            <Text style={styles.question}>
              What's holding you back from connecting your exchange?
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {SURVEY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    selectedOption?.id === option.id && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleOptionSelect(option)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedOption?.id === option.id && styles.radioOuterSelected,
                      ]}
                    >
                      {selectedOption?.id === option.id && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        selectedOption?.id === option.id && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {option.redirectTo && (
                    <View style={styles.helpBadge}>
                      <Text style={styles.helpBadgeText}>We can help!</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Feedback text input */}
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackLabel}>Any other thoughts? (optional)</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Share your feedback..."
                placeholderTextColor={colors.textTertiary}
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !selectedOption && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!selectedOption || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
                <Text style={styles.dismissButtonText}>Ask me later</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      paddingBottom: 40,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      position: 'absolute',
      right: 16,
      top: 16,
      padding: 4,
      zIndex: 1,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    question: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
    },
    optionsContainer: {
      paddingHorizontal: 20,
    },
    optionButton: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: colors.border,
    },
    optionButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.textSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    radioOuterSelected: {
      borderColor: colors.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    optionLabel: {
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    optionLabelSelected: {
      color: colors.primary,
      fontWeight: '500',
    },
    helpBadge: {
      backgroundColor: '#E8F5E9',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 8,
      alignSelf: 'flex-start',
      marginLeft: 34,
    },
    helpBadgeText: {
      fontSize: 12,
      color: '#2E7D32',
      fontWeight: '600',
    },
    feedbackContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    feedbackLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    feedbackInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      minHeight: 80,
    },
    actions: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    dismissButton: {
      padding: 16,
      alignItems: 'center',
    },
    dismissButtonText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
  });
