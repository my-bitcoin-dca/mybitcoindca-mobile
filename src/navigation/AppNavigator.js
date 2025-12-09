import React, { useEffect, useState, forwardRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Screens
import DisclaimerScreen from '../screens/DisclaimerScreen';
import LoginScreen from '../screens/LoginScreen';
import PasscodeScreen from '../screens/PasscodeScreen';
import HomeScreen from '../screens/HomeScreen';
import APIKeysScreen from '../screens/APIKeysScreen';
import WithdrawalApprovalScreen from '../screens/WithdrawalApprovalScreen';
import TradeExecutionScreen from '../screens/TradeExecutionScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import storage from '../utils/storage';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AppNavigator = forwardRef(({ pendingNotification, onNotificationHandled }, ref) => {
  const { isAuthenticated, passcodeLocked, loading, hasPasscode } = useAuth();
  const { colors } = useTheme();
  const [needsPasscodeSetup, setNeedsPasscodeSetup] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [checkingDisclaimer, setCheckingDisclaimer] = useState(true);

  useEffect(() => {
    checkDisclaimerStatus();
  }, []);

  useEffect(() => {
    checkPasscodeSetup();
  }, [isAuthenticated, passcodeLocked]);

  const checkDisclaimerStatus = async () => {
    try {
      const accepted = await storage.getItem('disclaimer_accepted');
      setDisclaimerAccepted(accepted === 'true');
    } catch (error) {
      console.error('Error checking disclaimer:', error);
      setDisclaimerAccepted(false);
    } finally {
      setCheckingDisclaimer(false);
    }
  };

  const checkPasscodeSetup = async () => {
    if (isAuthenticated) {
      const hasCode = await hasPasscode();
      setNeedsPasscodeSetup(!hasCode);
    }
  };

  // Handle pending notifications after authentication and navigation is ready
  useEffect(() => {
    if (
      pendingNotification &&
      isNavigationReady &&
      isAuthenticated &&
      !passcodeLocked &&
      !needsPasscodeSetup &&
      ref?.current
    ) {
      // Delay to ensure navigation stack is fully mounted after passcode unlock
      // The stack completely changes from PasscodeUnlock to MainTabs + modals
      const timeout = setTimeout(() => {
        ref.current?.navigate(pendingNotification.screen, pendingNotification.params);
        onNotificationHandled?.();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [pendingNotification, isNavigationReady, isAuthenticated, passcodeLocked, needsPasscodeSetup, onNotificationHandled, ref]);

  // Bottom Tab Navigator for main screens
  function MainTabs() {
    return (
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.secondary,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBackground,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: 24,
            paddingTop: 8,
            height: 80,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginBottom: 4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
          headerStyle: {
            backgroundColor: colors.cardBackground,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 20,
            color: colors.text,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            headerShown: true,
            headerTitle: 'My Bitcoin DCA',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{
            title: 'History',
            headerShown: true,
            headerTitle: 'Transactions',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'bar-chart' : 'bar-chart-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="APIKeys"
          component={APIKeysScreen}
          options={{
            title: 'Keys',
            headerShown: true,
            headerTitle: 'API Keys',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'key' : 'key-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            headerShown: true,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tab.Navigator>
    );
  }

  if (loading || checkingDisclaimer) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer
      ref={ref}
      onReady={() => setIsNavigationReady(true)}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!disclaimerAccepted ? (
          <Stack.Screen name="Disclaimer">
            {(props) => (
              <DisclaimerScreen
                {...props}
                onAccept={() => setDisclaimerAccepted(true)}
              />
            )}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : needsPasscodeSetup ? (
          <Stack.Screen
            name="PasscodeSetup"
            component={PasscodeScreen}
            initialParams={{ mode: 'setup' }}
          />
        ) : passcodeLocked ? (
          <Stack.Screen
            name="PasscodeUnlock"
            component={PasscodeScreen}
            initialParams={{ mode: 'unlock' }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WithdrawalApproval"
              component={WithdrawalApprovalScreen}
              options={{
                title: 'Approve Withdrawal',
                headerShown: true,
                presentation: 'modal',
                headerStyle: {
                  backgroundColor: colors.cardBackground,
                },
                headerTitleStyle: {
                  color: colors.text,
                },
              }}
            />
            <Stack.Screen
              name="TradeExecution"
              component={TradeExecutionScreen}
              options={{
                title: 'Execute DCA Purchase',
                headerShown: true,
                presentation: 'modal',
                headerStyle: {
                  backgroundColor: colors.cardBackground,
                },
                headerTitleStyle: {
                  color: colors.text,
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
});

export default AppNavigator;
