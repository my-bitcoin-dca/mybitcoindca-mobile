# DCA Bitcoin Mobile App

[![Semgrep Security](https://github.com/my-bitcoin-dca/mybitcoindca-mobile/actions/workflows/semgrep.yml/badge.svg)](https://github.com/my-bitcoin-dca/mybitcoindca-mobile/actions/workflows/semgrep.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Privacy First](https://img.shields.io/badge/Privacy-First-success.svg)](https://github.com/my-bitcoin-dca/mybitcoindca-mobile)

A React Native mobile app for secure Bitcoin withdrawal management with privacy-first, client-side security architecture.

**🔒 Security Verified:** Automated AI-powered scans verify that API keys never leave your device. [View latest scan →](https://github.com/my-bitcoin-dca/mybitcoindca-mobile/actions/workflows/semgrep.yml)

## Overview

This mobile app implements a **true privacy-first DCA and withdrawal system** for your Bitcoin platform:

- **User** deposits currency to Binance (manually or via recurring deposit)
- **Server** has NO Binance API keys and cannot access the exchange at all
- **Mobile app** stores the ONLY copy of full-access Binance API keys securely on the device
- **Purchases** - App notifies when to buy, user executes purchase through mobile app
- **Withdrawals** - App notifies when to withdraw, user approves via mobile app
- **API keys never leave the phone** - all trades and withdrawals execute directly from phone to Binance

## Key Features

### 🔐 Security
- Passcode protection for app access
- Secure key storage using Expo SecureStore (encrypted)
- API keys never transmitted to server
- Client-side security - server has no access to API keys
- **AI-powered security scanning** - Automated Semgrep scans verify API keys stay on device

### 📱 Core Functionality
- **Login** - Authenticate with your DCA account
- **API Key Management** - Store Binance API keys securely on device
- **Purchase Notifications** - Get notified when it's time to execute DCA purchases
- **Withdrawal Approval** - Review and approve withdrawal requests
- **Transaction History** - View DCA purchases and withdrawals
- **Push Notifications** - Get notified for both purchases and withdrawals

## Architecture

```
┌─────────────────────┐
│   Binance Exchange  │
│  (Holds Funds)      │
│                     │
│  - User deposits    │
│  - BTC accumulates  │
└─────────────────────┘
           ↑
           │
           │ Buy BTC / Withdraw
           │ (Direct from Phone)
           │
┌─────────────────────┐         ┌─────────────────────┐
│   Your Server       │         │   Mobile App        │
│   (No API Keys!)    │         │   (Full Keys)       │
│                     │         │                     │
│  - Tracks schedule  │────────→│  - Execute buys     │
│  - Sends push       │ Notify  │  - Approve withdraw │
│  - Records history  │         │  - Keys stay local  │
└─────────────────────┘         └─────────────────────┘
```

## User Guide

### First Time Setup

1. **Deposit Currency to Binance**
   - Deposit EUR (or your preferred currency) to your Binance account
   - You can set up recurring deposits or deposit manually
   - Keep funds available for DCA purchases

2. **Login to Mobile App**
   - Enter your DCA account credentials
   - Same account as web dashboard

3. **Create Passcode**
   - Set a 6-digit passcode
   - Required for accessing the app
   - Protects your API keys

4. **Configure API Keys**
   - Go to Settings → API Keys
   - Enter your Binance API keys (with spot trading + withdrawal permissions)
   - These are stored encrypted on your device
   - Never shared with the server

### Getting Binance API Keys

1. Log in to Binance.com
2. Go to Profile → API Management
3. Create a new API key
4. **Enable "Enable Spot & Margin Trading" permission** ⚠️
5. **Enable "Enable Withdrawals" permission** ⚠️
6. Optionally whitelist your IP for extra security
7. Copy API Key and Secret Key to the app

### Receiving Purchase Notifications

When it's time to execute your DCA purchase:

1. **Push Notification** arrives on your phone ("Time to buy Bitcoin")
2. **Tap notification** to open app
3. **Enter passcode** to unlock
4. **Review purchase details** and confirm
5. **Purchase executes directly** from your phone to Binance

### Receiving Withdrawal Notifications

When it's time to withdraw Bitcoin to your hardware wallet:

1. **Push Notification** arrives on your phone ("Time to withdraw Bitcoin")
2. **Tap notification** to open app
3. **Enter passcode** to unlock
4. **Review withdrawal details**:
   - Amount in BTC
   - Network fee
   - Destination address (your hardware wallet)
5. **Approve or Reject**
6. **Withdrawal executes directly** from your phone to Binance

## Security Verification

We believe in **transparency and verifiable security**. You don't have to trust us - you can verify our security claims:

### Automated Security Scanning

Every code change is automatically scanned with **Semgrep** - an AI-powered security tool that verifies:

✅ **API keys only stored in SecureStore** - Never in AsyncStorage or localStorage
✅ **API keys never transmitted** - No network requests containing API keys
✅ **No hardcoded credentials** - All keys are user-provided
✅ **Binance SDK usage only** - No manual HTTP requests with API keys
✅ **SecureStore retrieval only** - Keys only accessed from encrypted storage

### How to Verify

1. **View the security badge** at the top of this README
   - ✅ Green = All security checks passed
   - ❌ Red = Security issue detected (build will fail)

2. **Check the scan results**: [View latest security scan](https://github.com/my-bitcoin-dca/mybitcoindca-mobile/actions/workflows/semgrep.yml)

3. **Review the security rules**: See [`.semgrep/rules/api-key-security.yaml`](.semgrep/rules/api-key-security.yaml) for the exact checks

4. **Audit the code yourself**: This is open source - inspect every line!

### Continuous Security

- 🔄 Scans run on **every commit** and **pull request**
- 📅 Daily automated scans at midnight UTC
- 🚫 Pull requests with security issues **cannot be merged**
- 📊 All scan results are **publicly visible**

## Security Best Practices

### API Key Security
- ✅ Use API keys with spot trading + withdrawal permissions
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

## FAQ

**Q: What happens if I lose my phone?**
A: Your Binance API keys are encrypted on the device. Immediately revoke the API keys on Binance.com and create new ones on your new device.

**Q: Can I use the same API keys on multiple devices?**
A: Yes, but for security it's better to use device-specific keys with IP whitelisting.

**Q: What if I don't approve a purchase or withdrawal?**
A: Funds stay on the exchange until you execute the action. You can do it later when convenient.

**Q: How are the keys encrypted?**
A: We use Expo SecureStore which uses iOS Keychain and Android Keystore for hardware-backed encryption.

**Q: Can the server execute purchases or withdrawals without my approval?**
A: No. The server has NO Binance API keys at all. Only your phone can access Binance and execute trades/withdrawals.

**Q: How does the server know when to send notifications?**
A: You configure DCA and withdrawal schedules (e.g., weekly). The server sends notifications based on these schedules. You can also manually trigger purchases or withdrawals from the web dashboard.

## Support

For issues, questions, or contributions:
- Check existing issues in the repository
- Create a new issue with detailed information
- Include logs and screenshots if possible

## License

MIT License - see [LICENSE](LICENSE) file for details.
