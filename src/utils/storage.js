import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform secure storage wrapper
 * Uses SecureStore on native platforms and localStorage on web
 */

const isWeb = Platform.OS === 'web';

export const storage = {
  async getItem(key) {
    try {
      if (isWeb) {
        return localStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      return null;
    }
  },

  async setItem(key, value) {
    try {
      if (isWeb) {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      throw error;
    }
  },

  async deleteItem(key) {
    try {
      if (isWeb) {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      throw error;
    }
  },
};

export default storage;
