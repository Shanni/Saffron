# Saffron 🌻

Saffron is an natively onchain financial assistant app featuring a natural language interface for trading and cross-chain bridging. Built with React Native and Expo, it provides seamless access to perpetual trading on Ekiden DEX and cross-chain transfers via CCTP.

## 🏗️ Architecture

### Frontend (React Native/Expo)
- **Cross-platform app** - iOS, Android, and Web support
- **Natural language interface** - Chat-based trading and bridging
- ** Wallet integration** - Native wallet connectivity
- **Real-time market data** - Live price feeds and trading interface

### Backend API
- **Node.js/Express server** - Located in `../backend/`
- **Ekiden DEX integration** - perpetual trading
- **CCTP bridge integration** - Cross-chain transfers
- **JWT authentication** - Secure API access

## 🚀 Quick Start

### 1. Start Backend Server
```bash
cd ../backend
npm install
npm start  # Runs on http://localhost:3000
```

### 2. Start Mobile App
```bash
npm install
npx expo start
```

Choose your development environment:
- **Development build** - Full native features
- **iOS Simulator** - iOS development
- **Android Emulator** - Android development  
- **Expo Go** - Quick testing (limited features)

## 📱 Features

### Trading
- **Perpetual futures** 
- **Market & limit orders** with up to 10x leverage
- **Real-time price feeds** and market data
- **Trade preview** before execution
- **Portfolio management** and P&L tracking

### Cross-Chain Bridging
- **USDC transfers** between supported chains
- **CCTP integration** for fast, secure bridging
- **Multi-chain support** (Arbitrum, Base, etc.)
- **Bridge preview** with fees and timing

### Natural Language Interface
- **Chat-based commands** for trading and bridging
- **Voice input support** via Expo
- **Smart order parsing** from natural language
- **Transaction history** and notifications

## 🛠️ Development

### Project Structure
```
Saffron/
├── app/                 # Expo Router pages
├── components/          # Reusable UI components
├── api/                 # API client integrations
├── assets/             # Images, fonts, icons
├── constants/          # App configuration
├── hooks/              # Custom React hooks
└── scripts/            # Build and utility scripts
```

### Key Technologies
- **React Native** - Cross-platform mobile framework
- **Expo Router** - File-based navigation
- **TypeScript** - Type-safe development
- **Onchain SDK** - Blockchain integration
- **React Navigation** - Advanced navigation

### API Integration
```typescript
import backendAPI from '@/api/backend-client';

// Execute trade
const result = await backendAPI.executeTrade({
  symbol: 'APT',
  side: 'buy',
  size: 5,
  type: 'market',
  leverage: 1
});

// Bridge USDC
const bridge = await backendAPI.executeBridge({
  fromChain: 'arbitrum',
  toChain: 'base',
  amount: '100'
});
```

## 🔧 Configuration

### Environment Setup
1. **Native Onchain wallet** - Install Petra or Martian wallet
2. **Backend server** - Ensure API server is running
3. **Development tools** - Expo CLI and React Native debugger

### Build Commands
```bash
npm run android      # Android development
npm run ios         # iOS development  
npm run web         # Web development
npm run lint        # Code linting
```

## 📚 Documentation

- **API Documentation** - See `../backend/README.md`
- **Component Library** - See `./components/README.md`

## 🌐 Supported Networks
  
  ### Trading (Perp Dex)
  - **Mainnet** - Production trading
  - **Testnet** - Development and testing
  
  ### Bridging (CCTP)
  - **Aptos** - Native Aptos support
  - **Solana** - High-throughput L1
  - **Base** - Coinbase L2
  - **Arbitrum** - Layer 2 scaling
  - **Ethereum** - Mainnet support
  
## 🔐 Security

- **Non-custodial** - Users control their private keys
- **Signature verification** - All transactions signed locally
- **Secure API** - JWT authentication and HTTPS
- **Audit ready** - Clean, auditable smart contract interactions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is private and proprietary to SaffronTrade.
