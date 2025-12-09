# DCA Bitcoin Mobile App

A React Native mobile app for secure Bitcoin withdrawal management with zero-knowledge architecture.

## Overview

This mobile app implements a **true zero-knowledge withdrawal system** for your DCA Bitcoin platform:

- **Binance** handles automated DCA purchases via recurring buy (set up by user directly)
- **Server** has NO Binance API keys and cannot access the exchange at all
- **Mobile app** stores the ONLY copy of full-access Binance API keys securely on the device
- **Withdrawals** require user approval via the mobile app
- **API keys never leave the phone** - withdrawals execute directly from phone to Binance

## Key Features

### 🔐 Security
- Passcode protection for app access
- Secure key storage using Expo SecureStore (encrypted)
- API keys never transmitted to server
- Zero-knowledge architecture

### 📱 Core Functionality
- **Login** - Authenticate with your DCA account
- **API Key Management** - Store Binance API keys securely on device
- **Withdrawal Approval** - Review and approve withdrawal requests
- **Transaction History** - View DCA purchases and withdrawals
- **Push Notifications** - Get notified when withdrawals need approval

## Architecture

```
┌─────────────────────┐
│   Binance Exchange  │
│  (Recurring Buy)    │
│                     │
│  - Auto DCA buys    │
│  - BTC accumulates  │
└─────────────────────┘
           ↑
           │
           │ Withdrawal Request
           │ (Direct from Phone)
           │
┌─────────────────────┐         ┌─────────────────────┐
│   Your Server       │         │   Mobile App        │
│   (No API Keys!)    │         │   (Full Keys)       │
│                     │         │                     │
│  - Tracks schedule  │────────→│  - User approves    │
│  - Sends push       │ Notify  │  - Executes directly│
│  - Records history  │         │  - Keys stay local  │
└─────────────────────┘         └─────────────────────┘
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- Yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Physical device for push notifications (simulators don't support push)

### Installation

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies (already done via yarn):
```bash
yarn install
```

3. Configure API URL:
Edit `src/utils/config.js` and update the API URLs:
```javascript
export const API_URL = 'http://your-server-ip:3000/api';
export const AUTH_URL = 'http://your-server-ip:3000/api/auth';
```

### Running the App

#### Development Mode
```bash
# Start Expo dev server
yarn start

# Run on iOS simulator (Mac only)
yarn ios

# Run on Android emulator
yarn android
```

#### On Physical Device

1. Install Expo Go app on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. Start the dev server:
```bash
yarn start
```

3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

## User Guide

### First Time Setup

1. **Set up Binance Recurring Buy** (on Binance website)
   - Go to Binance → Buy Crypto → Recurring Buy
   - Set your DCA schedule (e.g., weekly €35)
   - BTC will automatically purchase on schedule

2. **Login to Mobile App**
   - Enter your DCA account credentials
   - Same account as web dashboard

3. **Create Passcode**
   - Set a 6-digit passcode
   - Required for accessing the app
   - Protects your API keys

4. **Configure API Keys**
   - Go to Settings → API Keys
   - Enter your Binance API keys (with withdrawal permission)
   - These are stored encrypted on your device
   - Never shared with the server

### Getting Binance API Keys

1. Log in to Binance.com
2. Go to Profile → API Management
3. Create a new API key
4. **Enable "Enable Withdrawals" permission** ⚠️
5. Optionally whitelist your IP for extra security
6. Copy API Key and Secret Key to the app

### Receiving Withdrawal Notifications

When it's time to withdraw Bitcoin to your hardware wallet:

1. **Push Notification** arrives on your phone
2. **Tap notification** to open app
3. **Enter passcode** to unlock
4. **Review withdrawal details**:
   - Amount in EUR and BTC
   - Network fee
   - Destination address
5. **Approve or Reject**
6. **Withdrawal executes directly** from your phone to Binance

## Security Best Practices

### API Key Security
- ✅ Use API keys with withdrawal permission
- ✅ Consider IP whitelisting on Binance
- ✅ Enable 2FA on your Binance account
- ✅ Keep your phone OS updated
- ✅ Use a strong passcode
- ❌ Never share your API keys
- ❌ Never take screenshots of keys

### Device Security
- Use biometric lock (Face ID/Touch ID) on your phone
- Enable "Find My Device" for theft protection
- Don't root/jailbreak your device
- Only download the app from official sources

## Troubleshooting

### Can't Login
- Check API URL in `src/utils/config.js`
- Ensure server is running
- Check network connectivity
- Verify credentials

### Push Notifications Not Working
- Notifications only work on physical devices
- Check notification permissions in phone settings
- Ensure app has permission to send notifications
- Verify Expo push token is registered on server

### API Keys Not Working
- Verify keys have withdrawal permission on Binance
- Check if IP whitelisting is preventing connection
- Test connection using "Test Connection" button
- Ensure keys are copied correctly (no extra spaces)

### App Crashes on Startup
- Clear app data and reinstall
- Check logs: `npx expo start --dev-client`
- Ensure all dependencies are installed

## Development

### Project Structure
```
mobile/
├── src/
│   ├── screens/           # App screens
│   │   ├── LoginScreen.js
│   │   ├── PasscodeScreen.js
│   │   ├── HomeScreen.js
│   │   ├── APIKeysScreen.js
│   │   ├── WithdrawalApprovalScreen.js
│   │   └── TransactionsScreen.js
│   ├── services/          # API & service layer
│   │   ├── api.js
│   │   ├── binanceService.js
│   │   └── notificationService.js
│   ├── contexts/          # React contexts
│   │   └── AuthContext.js
│   ├── navigation/        # Navigation setup
│   │   └── AppNavigator.js
│   ├── components/        # Reusable components
│   └── utils/             # Utilities
│       └── config.js
├── App.js                 # App entry point
├── app.json              # Expo config
└── package.json
```

### Adding New Features

1. Create screen in `src/screens/`
2. Add navigation route in `src/navigation/AppNavigator.js`
3. Add API calls in `src/services/api.js`
4. Update README

## Production Deployment

### Building for iOS

1. Configure app.json with bundle identifier
2. Build:
```bash
eas build --platform ios
```
3. Submit to App Store:
```bash
eas submit --platform ios
```

### Building for Android

1. Configure app.json with package name
2. Build:
```bash
eas build --platform android
```
3. Submit to Play Store:
```bash
eas submit --platform android
```

## FAQ

**Q: What happens if I lose my phone?**
A: Your Binance API keys are encrypted on the device. Immediately revoke the API keys on Binance.com and create new ones on your new device.

**Q: Can I use the same API keys on multiple devices?**
A: Yes, but for security it's better to use device-specific keys with IP whitelisting.

**Q: What if I don't approve a withdrawal?**
A: Bitcoin stays on the exchange until you approve the withdrawal. You can approve it later.

**Q: How are the keys encrypted?**
A: We use Expo SecureStore which uses iOS Keychain and Android Keystore for hardware-backed encryption.

**Q: Can the server execute withdrawals without my approval?**
A: No. The server has NO Binance API keys at all. Only your phone can access Binance and execute withdrawals.

**Q: How does the server know when to send withdrawal notifications?**
A: You configure withdrawal schedules (e.g., weekly). The server sends notifications based on this schedule. You can also manually request withdrawals from the web dashboard.

## Support

For issues, questions, or contributions:
- Check existing issues in the repository
- Create a new issue with detailed information
- Include logs and screenshots if possible

## License

[Your License Here]
