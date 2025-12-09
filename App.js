import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerForPushNotifications,
  sendPushTokenToServer,
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
    // Only set up push notifications on native platforms (iOS/Android)
    if (Platform.OS !== 'web') {
      // Register for push notifications
      registerForPushNotifications().then(token => {
        if (token) {
          sendPushTokenToServer(token);
        }
      }).catch(err => {
        console.log('Push notification registration failed:', err);
      });

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
  );
}
