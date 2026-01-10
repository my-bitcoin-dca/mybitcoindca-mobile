import Constants from 'expo-constants';

// API Configuration
export const API_URL = __DEV__
  ? 'http://localhost:3000/api'  // Development
  : 'https://dca-fefq.onrender.com/api';  // Production

export const AUTH_URL = __DEV__
  ? 'http://localhost:3000/api/auth'  // Development
  : 'https://dca-fefq.onrender.com/api/auth';

// Google OAuth Configuration
// Configure these in app.json under expo.extra.googleOAuth
// Web client ID is used for expo-auth-session (works for Expo Go and development)
// iOS and Android client IDs are for production builds
const googleOAuth = Constants.expoConfig?.extra?.googleOAuth || {};
export const GOOGLE_WEB_CLIENT_ID = googleOAuth.webClientId || '';
export const GOOGLE_IOS_CLIENT_ID = googleOAuth.iosClientId || '';
export const GOOGLE_ANDROID_CLIENT_ID = googleOAuth.androidClientId || '';
