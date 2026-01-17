import React, { createContext, useState, useEffect, useContext } from 'react';
import storage from '../utils/storage';
import { authAPI } from '../services/api';
import { registerForPushNotifications, sendPushTokenToServer } from '../services/notificationService';
import { Platform } from 'react-native';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeLocked, setPasscodeLocked] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const accessToken = await storage.getItem('accessToken');
      if (accessToken) {
        const response = await authAPI.getMe();
        if (response.success) {
          setUser(response.data.user);
          setIsAuthenticated(true);
          // Register push notifications after successful auth check
          await registerPushToken();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      if (response.success) {
        await storage.setItem('accessToken', response.data.accessToken);
        setUser(response.data.user);
        setIsAuthenticated(true);
        // Register push notifications after successful login
        await registerPushToken();
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await authAPI.register(name, email, password);
      if (response.success) {
        await storage.setItem('accessToken', response.data.accessToken);
        setUser(response.data.user);
        setIsAuthenticated(true);
        // Register push notifications after successful registration
        await registerPushToken();
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const googleLogin = async (idToken) => {
    try {
      const response = await authAPI.googleLogin(idToken);
      if (response.success) {
        await storage.setItem('accessToken', response.data.accessToken);
        setUser(response.data.user);
        setIsAuthenticated(true);
        // Register push notifications after successful Google login
        await registerPushToken();
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Google login failed',
      };
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await authAPI.requestPasswordReset(email);
      return { success: response.success, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send reset email',
      };
    }
  };

  const verifyResetToken = async (token) => {
    try {
      const response = await authAPI.verifyResetToken(token);
      return { success: response.success, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid reset token',
      };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await authAPI.resetPassword(token, newPassword);
      return { success: response.success, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reset password',
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await storage.deleteItem('accessToken');
      await storage.deleteItem('disclaimer_accepted');
      await storage.deleteItem('onboarding_completed');
      await storage.deleteItem('user_country');
      setUser(null);
      setIsAuthenticated(false);
      setPasscodeLocked(true);
    }
  };

  const unlockWithPasscode = async (passcode) => {
    try {
      const response = await authAPI.verifyPasscode(passcode);
      if (response.success) {
        setPasscodeLocked(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Passcode verification failed:', error);
      return false;
    }
  };

  const setPasscode = async (passcode) => {
    try {
      const response = await authAPI.setPasscode(passcode);
      return response.success;
    } catch (error) {
      console.error('Failed to set passcode:', error);
      return false;
    }
  };

  const hasPasscode = async () => {
    try {
      const response = await authAPI.getPasscodeStatus();
      return response.success && response.data.hasPasscode;
    } catch (error) {
      console.error('Failed to check passcode status:', error);
      return false;
    }
  };

  const requestPasscodeReset = async () => {
    try {
      const response = await authAPI.requestPasscodeReset();
      return { success: response.success, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send reset email',
      };
    }
  };

  const confirmPasscodeReset = async (token, newPasscode) => {
    try {
      const response = await authAPI.confirmPasscodeReset(token, newPasscode);
      return { success: response.success, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reset passcode',
      };
    }
  };

  const lockApp = () => {
    setPasscodeLocked(true);
  };

  // Helper function to register push notifications
  const registerPushToken = async () => {
    // Only register on native platforms (iOS/Android)
    if (Platform.OS === 'web') return;

    try {
      const token = await registerForPushNotifications();
      if (token) {
        await sendPushTokenToServer(token);
        console.log('[Auth] Push token registered successfully');
      }
    } catch (error) {
      console.log('[Auth] Push notification registration failed:', error);
      // Don't fail auth if push registration fails
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        passcodeLocked,
        login,
        register,
        googleLogin,
        logout,
        requestPasswordReset,
        verifyResetToken,
        resetPassword,
        unlockWithPasscode,
        setPasscode,
        hasPasscode,
        lockApp,
        checkAuth,
        requestPasscodeReset,
        confirmPasscodeReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
