import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, Alert, StatusBar as RNStatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  setupNotificationListeners,
  parseWithdrawalNotification,
  parseTradeExecutionNotification,
} from './src/services/notificationService';

export default function App() {
  const navigationRef = useRef(null);
  const [pendingNotification, setPendingNotification] = useState(null);

  // Shared function to handle notification responses
  const handleNotificationResponse = (response) => {
    // Check for withdrawal notifications
    const withdrawalData = parseWithdrawalNotification(response.notification);
    if (withdrawalData) {
      setPendingNotification({
        type: 'withdrawal',
        screen: 'WithdrawalApproval',
        params: { withdrawalData },
      });
      return;
    }

    // Check for trade execution notifications
    const tradeData = parseTradeExecutionNotification(response.notification);
    if (tradeData) {
      setPendingNotification({
        type: 'trade',
        screen: 'TradeExecution',
        params: { tradeData },
      });
    }
  };

  useEffect(() => {
    // Configure status bar for Android
    if (Platform.OS === 'android') {
      RNStatusBar.setBarStyle('dark-content');
      RNStatusBar.setBackgroundColor('#ffffff');
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  useEffect(() => {
    // Only set up push notifications on native platforms (iOS/Android)
    if (Platform.OS !== 'web') {
      // Push token registration is now handled in AuthContext after login/registration
      // This ensures the user is authenticated before sending the token to the server

      // Check if app was opened from a notification tap
      const checkInitialNotification = async () => {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          handleNotificationResponse(response);
        }
      };
      checkInitialNotification();

      // Set up notification listeners
      const cleanup = setupNotificationListeners(
        // When notification is received (app is open)
        (notification) => {
          // Check for withdrawal notifications
          const withdrawalData = parseWithdrawalNotification(notification);
          if (withdrawalData) {
            Alert.alert(
              'Withdrawal Request',
              'You have a pending withdrawal request. Tap to review.',
              [
                {
                  text: 'Review Now',
                  onPress: () => {
                    navigationRef.current?.navigate('WithdrawalApproval', {
                      withdrawalData,
                    });
                  },
                },
                { text: 'Later', style: 'cancel' },
              ]
            );
            return;
          }

          // Check for trade execution notifications
          const tradeData = parseTradeExecutionNotification(notification);
          if (tradeData) {
            Alert.alert(
              'DCA Purchase Ready',
              `Execute your scheduled €${tradeData.eurAmount} BTC purchase?`,
              [
                {
                  text: 'Execute Now',
                  onPress: () => {
                    navigationRef.current?.navigate('TradeExecution', {
                      tradeData,
                    });
                  },
                },
                { text: 'Skip', style: 'cancel' },
              ]
            );
          }
        },
        // When notification is tapped (app is closed/background)
        handleNotificationResponse
      );

      return cleanup;
    }
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <AppNavigator
              ref={navigationRef}
              pendingNotification={pendingNotification}
              onNotificationHandled={() => setPendingNotification(null)}
            />
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
