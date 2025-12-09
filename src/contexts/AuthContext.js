import React, { createContext, useState, useEffect, useContext } from 'react';
import storage from '../utils/storage';
import { authAPI } from '../services/api';

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

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await storage.deleteItem('accessToken');
      setUser(null);
      setIsAuthenticated(false);
      setPasscodeLocked(true);
    }
  };

  const unlockWithPasscode = async (passcode) => {
    const storedPasscode = await storage.getItem('app_passcode');
    if (storedPasscode === passcode) {
      setPasscodeLocked(false);
      return true;
    }
    return false;
  };

  const setPasscode = async (passcode) => {
    await storage.setItem('app_passcode', passcode);
  };

  const hasPasscode = async () => {
    const passcode = await storage.getItem('app_passcode');
    return !!passcode;
  };

  const lockApp = () => {
    setPasscodeLocked(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        passcodeLocked,
        login,
        logout,
        unlockWithPasscode,
        setPasscode,
        hasPasscode,
        lockApp,
        checkAuth,
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
