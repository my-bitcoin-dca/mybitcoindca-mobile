import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 * @returns {Promise<string|null>} Expo push token or null if failed
 */
export async function registerForPushNotifications() {
  let token = null;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

/**
 * Send push token to server
 * @param {string} token - Expo push token
 */
export async function sendPushTokenToServer(token) {
  try {
    const { sendPushToken } = await import('./api');
    const result = await sendPushToken(token);
    if (result.success) {
      console.log('Push token sent to server');
    }
  } catch (error) {
    console.error('Failed to send push token to server:', error);
  }
}

/**
 * Set up notification listeners
 * @param {Function} onNotificationReceived - Callback when notification is received (app is foreground)
 * @param {Function} onNotificationTapped - Callback when notification is tapped
 * @returns {Object} Object with cleanup functions
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
  // This listener is fired whenever a notification is received while the app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // This listener is fired whenever a user taps on or interacts with a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Handle a withdrawal notification
 * Parse the notification data and prepare it for the approval screen
 * @param {Object} notification - Notification object
 * @returns {Object|null} Withdrawal data or null
 */
export function parseWithdrawalNotification(notification) {
  const data = notification.request.content.data;

  if (data.type === 'withdrawal_request') {
    return {
      eurAmount: data.eurAmount,
      btcAmount: data.btcAmount,
      address: data.address,
      requestId: data.requestId,
      appWithdrawal: data.appWithdrawal,
    };
  }

  return null;
}

/**
 * Handle a trade execution notification
 * Parse the notification data and prepare it for trade execution
 * @param {Object} notification - Notification object
 * @returns {Object|null} Trade execution data or null
 */
export function parseTradeExecutionNotification(notification) {
  const data = notification.request.content.data;

  if (data.type === 'trade_execution_request') {
    return {
      eurAmount: data.eurAmount,
      requestId: data.requestId,
      scheduledTime: data.scheduledTime,
    };
  }

  return null;
}

/**
 * Handle an anomaly alert notification
 * Parse the notification data for anomaly detection alerts
 * @param {Object} notification - Notification object
 * @returns {Object|null} Anomaly alert data or null
 */
export function parseAnomalyAlertNotification(notification) {
  const data = notification.request.content.data;

  if (data.type === 'anomaly_alert') {
    return {
      alertId: data.alertId,
      currentPrice: data.currentPrice,
      confidence: data.confidence,
      successRate: data.successRate,
      expectedReturn: data.expectedReturn,
      priceChange: data.priceChange,
      currency: data.currency,
    };
  }

  return null;
}
