// API Configuration
export const API_URL = __DEV__
  ? 'http://localhost:3000/api'  // Development
  : 'https://dca-fefq.onrender.com/api';  // Production

export const AUTH_URL = __DEV__
  ? 'http://localhost:3000/api/auth'  // Development
  : 'https://dca-fefq.onrender.com/api/auth';
