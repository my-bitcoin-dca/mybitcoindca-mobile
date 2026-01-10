import axios from 'axios';
import storage from '../utils/storage';
import { AUTH_URL, API_URL } from '../utils/config';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add access token
api.interceptors.request.use(
  async (config) => {
    const accessToken = await storage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the access token
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          const newAccessToken = await storage.getItem('accessToken');
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Token refresh failed, user needs to log in again
        await storage.deleteItem('accessToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Refresh access token
async function refreshAccessToken() {
  try {
    const response = await axios.post(`${AUTH_URL}/token`, {}, {
      withCredentials: true,
    });

    if (response.data.success) {
      await storage.setItem('accessToken', response.data.data.accessToken);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return false;
  }
}

// Send push token to server
export async function sendPushToken(token) {
  try {
    const response = await api.post('/auth/push-token', { token });
    return response.data;
  } catch (error) {
    console.error('Failed to send push token:', error);
    return { success: false, error: error.message };
  }
}

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    const response = await axios.post(`${AUTH_URL}/login`, {
      email,
      password,
    }, {
      withCredentials: true,
    });
    return response.data;
  },

  register: async (name, email, password) => {
    const response = await axios.post(`${AUTH_URL}/register`, {
      name,
      email,
      password,
    }, {
      withCredentials: true,
    });
    return response.data;
  },

  googleLogin: async (idToken) => {
    const response = await axios.post(`${AUTH_URL}/google`, {
      idToken,
    }, {
      withCredentials: true,
    });
    return response.data;
  },

  requestPasswordReset: async (email) => {
    const response = await axios.post(`${AUTH_URL}/forgot-password`, {
      email,
      platform: 'mobile',
    });
    return response.data;
  },

  verifyResetToken: async (token) => {
    const response = await axios.post(`${AUTH_URL}/verify-reset-token`, {
      token,
    });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await axios.post(`${AUTH_URL}/reset-password`, {
      token,
      newPassword,
    });
    return response.data;
  },

  getSettings: async () => {
    const response = await axios.get(`${AUTH_URL}/settings`, {
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${await storage.getItem('accessToken')}`,
      },
    });
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await axios.put(`${AUTH_URL}/settings`, settings, {
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${await storage.getItem('accessToken')}`,
      },
    });
    return response.data;
  },

  logout: async () => {
    const response = await axios.post(`${AUTH_URL}/logout`, {}, {
      withCredentials: true,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get('/auth/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.put('/auth/settings', settings);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete('/auth/account');
    return response.data;
  },

  // Passcode API methods
  getPasscodeStatus: async () => {
    const response = await api.get('/auth/passcode/status');
    return response.data;
  },

  setPasscode: async (passcode) => {
    const response = await api.post('/auth/passcode', { passcode });
    return response.data;
  },

  verifyPasscode: async (passcode) => {
    const response = await api.post('/auth/passcode/verify', { passcode });
    return response.data;
  },

  requestPasscodeReset: async () => {
    const response = await api.post('/auth/passcode/reset');
    return response.data;
  },

  confirmPasscodeReset: async (token, newPasscode) => {
    const response = await axios.post(`${AUTH_URL}/passcode/reset/confirm`, {
      token,
      newPasscode,
    });
    return response.data;
  },
};

// DCA API calls
export const dcaAPI = {
  getTransactions: async () => {
    const response = await api.get('/transactions');
    return response.data;
  },

  getPurchases: async () => {
    const response = await api.get('/purchases');
    return response.data;
  },

  getMonthlyProgress: async () => {
    const response = await api.get('/monthly-progress');
    return response.data;
  },

  reportWithdrawal: async (withdrawalData) => {
    const response = await api.post('/report-withdrawal', withdrawalData);
    return response.data;
  },

  reportTradeExecution: async (tradeData) => {
    const response = await api.post('/report-trade-execution', tradeData);
    return response.data;
  },
};

export default api;
