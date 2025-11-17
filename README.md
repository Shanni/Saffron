# Saffron - Cross-Chain USDC Transfer App 🌉

<div align="center">

**A mobile-first application for seamless USDC transfers between Base and Aptos**

[![Expo](https://img.shields.io/badge/Expo-~54.0.9-blue.svg)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.4-green.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-~5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![Aptos](https://img.shields.io/badge/Aptos-Testnet-orange.svg)](https://aptoslabs.com/)
[![Circle CCTP](https://img.shields.io/badge/Circle-CCTP-purple.svg)](https://www.circle.com/en/cross-chain-transfer-protocol)

</div>

---

## 📖 Overview

**Saffron** is a production-ready mobile application built with **React Native** and **Expo** that enables seamless **USDC cross-chain transfers** between **Base Sepolia** and **Aptos Testnet** using **Circle's Cross-Chain Transfer Protocol (CCTP)**.

The app provides a native mobile experience for iOS, Android, and Web, with integrated wallet support for both EVM (MetaMask, OKX) and Aptos (Petra, OKX) ecosystems.

### Key Features

- 🔐 **Secure & Trustless**: Built on Circle's official CCTP protocol
- ⚡ **Fast Transfers**: Cross-chain transfers complete in 2-5 minutes
- 💰 **Cost Efficient**: Only network gas fees, no bridge fees
- 📱 **Mobile-First**: Native iOS/Android/Web support via Expo
- 🎨 **Modern UI/UX**: Clean interface with dark mode support
- 🔗 **Multi-Wallet**: Petra, OKX, MetaMask integration
- 🌐 **Universal**: File-based routing with Expo Router
- 🛡️ **Non-Custodial**: Users always control their private keys

---

## 🎯 Use Cases

1. **Cross-Chain Asset Transfer**: Move USDC from Base to Aptos instantly
2. **DeFi Integration**: Transfer USDC to Aptos for DeFi opportunities
3. **Portfolio Rebalancing**: Manage multi-chain USDC holdings
4. **Developer Testing**: Test CCTP integration in mobile environment

---

## 🏗️ Architecture

### Technology Stack

```yaml
Framework: React Native + Expo
Language: TypeScript
Routing: Expo Router (file-based)
Styling: React Native StyleSheet
State: React Hooks
Blockchain:
  - Aptos: @aptos-labs/ts-sdk v1.33+
  - Base: ethers.js v6.13+
Wallets:
  - Aptos: Petra, OKX Aptos Provider
  - Base: MetaMask, OKX Web3 Provider
```

### Project Structure

```
Saffron/
├── app/                      # Expo Router pages
│   ├── (tabs)/               # Tab navigation screens
│   │   ├── index.tsx         # Home/Transfer screen
│   │   └── explore.tsx       # Explore/History screen
│   ├── _layout.tsx           # Root layout
│   └── modal.tsx             # Modal screens
│
├── components/               # Reusable UI components
│   ├── ui/                   # Base UI components
│   │   ├── icon-symbol.tsx
│   │   └── collapsible.tsx
│   ├── themed-text.tsx       # Themed text component
│   ├── themed-view.tsx       # Themed view component
│   └── PreviewModal.tsx      # Preview modal
│
├── services/                 # Blockchain services
│   ├── base-cctp-sender.ts   # Base USDC burn service
│   ├── aptos-cctp-receiver.ts # Aptos USDC mint service
│   ├── circle-attestation.ts # Circle API integration
│   ├── hybrid-wallet.ts      # Hybrid wallet adapter
│   ├── okx-wallet.ts         # OKX wallet integration
│   └── wallets.ts            # Wallet utilities
│
├── constants/                # App constants
│   └── contracts.ts          # Contract addresses
│
├── api/                      # API endpoints (optional)
├── assets/                   # Images, fonts, etc.
└── hooks/                    # Custom React hooks
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.x
- **npm** or **yarn**
- **Expo Go** App ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **Wallets**:
  - [Petra Wallet](https://petra.app/) (Browser extension for Aptos)
  - [MetaMask](https://metamask.io/) (Browser extension for Base)
  - [OKX Wallet](https://www.okx.com/web3) (Optional, supports both chains)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Saffron

# Install dependencies
npm install

# Start development server
npx expo start
```

### Running on Different Platforms

#### Mobile (iOS/Android)

```bash
# Start the dev server
npx expo start

# Scan QR code with:
# - iOS: Camera app or Expo Go
# - Android: Expo Go app
```

#### Web

```bash
npx expo start --web
```

#### Platform-Specific

```bash
npx expo start --android    # Android emulator/device
npx expo start --ios        # iOS simulator/device (macOS only)
```

---

## 💻 Core Services

### 1. Base CCTP Sender (`base-cctp-sender.ts`)

Handles USDC burning on Base Sepolia.

**Key Functions**:

#### `approveUSDC()`
```typescript
async approveUSDC(
  provider: any,
  amount: string,
  onProgress?: (step: string) => void
): Promise<string>
```
Approves TokenMessenger contract to spend USDC.

**Parameters**:
- `provider` - Web3 provider (MetaMask/OKX)
- `amount` - USDC amount to approve (e.g., "1.0")
- `onProgress` - Progress callback

**Returns**: Transaction hash

#### `burnUSDC()`
```typescript
async burnUSDC(
  provider: any,
  amount: string,
  aptosRecipient: string,
  onProgress?: (step: string) => void
): Promise<BurnResult>
```
Burns USDC on Base and creates cross-chain message.

**Parameters**:
- `provider` - Web3 provider
- `amount` - USDC amount to burn
- `aptosRecipient` - Aptos recipient address (0x...)
- `onProgress` - Progress callback

**Returns**:
```typescript
{
  txHash: string;           // Base transaction hash
  messageHash: string;      // CCTP message hash
  messageBytes: string;     // Encoded message
  nonce: string;            // CCTP nonce
}
```

**Configuration**:
```typescript
const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  rpcUrl: 'https://sepolia.base.org',
  domainId: 6,
  contracts: {
    tokenMessengerV2: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitterV2: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
};
```

---

### 2. Circle Attestation Service (`circle-attestation.ts`)

Fetches Circle validator signatures.

#### `getAttestation()`
```typescript
async getAttestation(
  messageHash: string,
  onProgress?: (step: string, data?: any) => void
): Promise<AttestationData>
```

**Parameters**:
- `messageHash` - Message hash from burn transaction
- `onProgress` - Progress callback

**Returns**:
```typescript
{
  status: 'pending' | 'complete' | 'failed';
  messageHash: string;
  messageBytes: string;
  attestation: string;      // Circle signature (130 bytes)
}
```

**Configuration**:
```typescript
const CIRCLE_API_CONFIG = {
  baseUrl: 'https://iris-api-sandbox.circle.com',
  pollInterval: 2000,       // Poll every 2s
  maxWaitTime: 300000,      // 5 minutes max
  maxRetries: 150,
};
```

**Polling Logic**:
- Polls Circle API every 2 seconds
- Maximum wait time: 5 minutes
- Automatic retry on transient errors

---

### 3. Aptos CCTP Receiver (`aptos-cctp-receiver.ts`)

Handles USDC minting on Aptos.

#### `receiveUSDC()`
```typescript
async receiveUSDC(
  params: AptosReceiveParams
): Promise<AptosReceiveResult>
```

**Parameters**:
```typescript
interface AptosReceiveParams {
  messageBytes: string;     // From burn result
  attestation: string;      // From Circle API
  amount: string;           // User input amount
  onProgress?: (step: string, data?: any) => void;
}
```

**Returns**:
```typescript
interface AptosReceiveResult {
  txHash: string;           // Aptos transaction hash
  success: boolean;
  usdcAmount?: string;      // Minted USDC amount
  error?: string;
}
```

**Process**:
1. Checks if recipient has USDC registered
2. Auto-registers USDC if needed
3. Calls CCTP wrapper contract's `receive_usdc()` entry function
4. Waits for transaction confirmation
5. Returns transaction hash and status

**Configuration**:
```typescript
const APTOS_TESTNET_CONFIG = {
  network: 'testnet',
  rpcUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
  domainId: 9,
  packages: {
    messageTransmitter: '0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9',
    tokenMessengerMinter: '0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9',
  },
  objects: {
    usdc: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
  },
};
```

---

### 4. Wallet Integration

#### Petra Wallet (`services/wallets.ts`)

```typescript
// Connect Petra wallet
const wallet = await connectPetraWallet();

// Get account
const account = await wallet.account();

// Sign and submit transaction
const txHash = await wallet.signAndSubmitTransaction(payload);
```

#### OKX Wallet (`services/okx-wallet.ts`)

Supports both Aptos and Base chains:

```typescript
// Aptos connection
const aptosWallet = await connectOKXAptos();

// Base connection (Web3)
const baseProvider = await connectOKXBase();
```

#### Hybrid Wallet (`services/hybrid-wallet.ts`)

Unified interface for multiple wallets:

```typescript
class HybridWallet {
  async connectAptos(): Promise<AptosWallet>;
  async connectBase(): Promise<Web3Provider>;
  async disconnect(): Promise<void>;
}
```

---

## 🌉 Cross-Chain Transfer Flow

### Complete Transfer Process

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INITIATES TRANSFER                  │
│                                                             │
│  1. Enter amount (e.g., "10 USDC")                         │
│  2. Enter Aptos recipient address                          │
│  3. Click "Transfer"                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BASE SEPOLIA CHAIN                       │
│                                                             │
│  Step 1: Approve USDC                                      │
│  ├─ User approves TokenMessenger to spend USDC             │
│  └─ Tx: approve(tokenMessenger, amount)                    │
│                                                             │
│  Step 2: Burn USDC                                         │
│  ├─ Call depositForBurn()                                  │
│  ├─ Burns USDC on Base                                     │
│  ├─ Emits MessageSent event                                │
│  └─ Returns: messageHash, nonce                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    CIRCLE ATTESTATION                       │
│                                                             │
│  Step 3: Get Circle Signature                              │
│  ├─ Poll Circle API with messageHash                       │
│  ├─ Wait for validator signatures                          │
│  ├─ Typical wait: 15-30 seconds                            │
│  └─ Returns: attestation (130 bytes)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    APTOS TESTNET                            │
│                                                             │
│  Step 4: Register USDC (if needed)                         │
│  └─ Auto-register CoinStore<USDC> for recipient            │
│                                                             │
│  Step 5: Receive USDC                                      │
│  ├─ Call receive_usdc(message, attestation)                │
│  ├─ Verify Circle signature                                │
│  ├─ Check nonce (prevent replay)                           │
│  ├─ Mint USDC to recipient                                 │
│  └─ Returns: transaction hash                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRANSFER COMPLETE                        │
│                                                             │
│  ✅ USDC successfully transferred                           │
│  ✅ Total time: 2-5 minutes                                 │
│  ✅ Cost: ~$0.10 (Base gas + Aptos gas)                     │
└─────────────────────────────────────────────────────────────┘
```

### Example Usage

```typescript
import { BaseCCTPSender } from './services/base-cctp-sender';
import { CircleAttestationService } from './services/circle-attestation';
import { AptosCCTPReceiver } from './services/aptos-cctp-receiver';

// Step 1: Approve USDC on Base
const baseSender = new BaseCCTPSender();
await baseSender.approveUSDC(
  web3Provider,
  "10.0",
  (step) => console.log(step)
);

// Step 2: Burn USDC on Base
const burnResult = await baseSender.burnUSDC(
  web3Provider,
  "10.0",
  "0xAPTOS_RECIPIENT_ADDRESS",
  (step) => console.log(step)
);

// Step 3: Get Circle attestation
const attestationService = new CircleAttestationService();
const attestation = await attestationService.getAttestation(
  burnResult.messageHash,
  (step) => console.log(step)
);

// Step 4: Receive USDC on Aptos
const aptosReceiver = new AptosCCTPReceiver();
const receiveResult = await aptosReceiver.receiveUSDC({
  messageBytes: burnResult.messageBytes,
  attestation: attestation.attestation,
  amount: "10.0",
  onProgress: (step) => console.log(step),
});

console.log(`Transfer complete! Tx: ${receiveResult.txHash}`);
```

---

## 📱 User Interface

### Main Screens

#### 1. Transfer Screen (`app/(tabs)/index.tsx`)

**Features**:
- Amount input with USDC balance display
- Aptos address input with validation
- Wallet connection status
- Transfer button with loading state
- Real-time progress updates

**User Flow**:
1. Connect Base wallet (MetaMask/OKX)
2. Connect Aptos wallet (Petra/OKX)
3. Enter transfer amount
4. Enter Aptos recipient address
5. Click "Transfer"
6. Approve USDC (if needed)
7. Confirm burn transaction
8. Wait for attestation (~30s)
9. Confirm receive transaction
10. View success message

#### 2. Explore Screen (`app/(tabs)/explore.tsx`)

**Features**:
- Transfer history
- Transaction status tracking
- Network statistics
- Help & documentation links

#### 3. Modal Screens (`app/modal.tsx`)

**Types**:
- Wallet connection modal
- Transaction confirmation
- Error messages
- Success notifications

---

## ⚙️ Configuration

### Environment Setup

Create a `.env` file (optional for custom RPC):

```bash
# Base Sepolia RPC (optional)
BASE_RPC_URL=https://sepolia.base.org

# Aptos Testnet RPC (optional)
APTOS_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1

# Circle API (default: testnet)
CIRCLE_API_URL=https://iris-api-sandbox.circle.com
```

### Network Configuration

All network configs are in `constants/contracts.ts`:

```typescript
export const APTOS_TESTNET_CONTRACTS = {
  messageTransmitter: '0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9',
  tokenMessenger: '0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9',
  usdc: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
  cctpWrapper: '0x96feac302e3b9c0cb53890aa2b5d4e3c1d23625fe621f05d8aa736d620627ffc',
};

export const BASE_SEPOLIA_CONTRACTS = {
  tokenMessengerV2: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  messageTransmitterV2: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};
```

---

## 🧪 Testing

### Development Testing

```bash
# Run in development mode
npx expo start

# Test on iOS simulator
npx expo start --ios

# Test on Android emulator
npx expo start --android

# Test on web browser
npx expo start --web
```

### Manual Test Checklist

- [ ] Connect Petra wallet
- [ ] Connect MetaMask to Base Sepolia
- [ ] Check USDC balance on Base
- [ ] Enter transfer amount (e.g., "1.0")
- [ ] Enter valid Aptos address
- [ ] Approve USDC transaction
- [ ] Burn USDC transaction
- [ ] Wait for Circle attestation
- [ ] Receive USDC on Aptos
- [ ] Verify balance increased on Aptos
- [ ] Check transaction history

### Test with Testnet Tokens

**Get Base Sepolia USDC**:
1. Get ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Get USDC from [Circle Faucet](https://faucet.circle.com/)

**Get Aptos Testnet APT**:
1. Visit [Aptos Faucet](https://aptoslabs.com/testnet-faucet)
2. Enter your Aptos address
3. Receive test APT

---

## 🔒 Security

### Security Features

- ✅ **Non-Custodial**: Private keys never leave user's wallet
- ✅ **No Backend**: Fully client-side application
- ✅ **Circle CCTP**: Built on audited Circle infrastructure
- ✅ **Signature Verification**: All transactions require user signature
- ✅ **Amount Validation**: Input validation and bounds checking
- ✅ **Address Validation**: Checksummed address verification

### Security Best Practices

1. **Never share private keys**: App never requests or stores private keys
2. **Verify addresses**: Always double-check recipient addresses
3. **Start small**: Test with small amounts first
4. **Testnet only**: This app is for testnet use only
5. **Wallet security**: Keep wallet extensions updated

### Known Limitations

- ⚠️ **Testnet Only**: Not audited for mainnet production
- ⚠️ **One Direction**: Only Base → Aptos (not reverse)
- ⚠️ **Manual Process**: Requires user interaction at each step
- ⚠️ **USDC Registration**: Recipient must have USDC registered on Aptos

---

## 📚 Resources

### Documentation

- [Circle CCTP Docs](https://developers.circle.com/stablecoins/docs/cctp-getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [Aptos TypeScript SDK](https://aptos.dev/sdks/ts-sdk/)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)

### Useful Links

- [Base Sepolia Explorer](https://sepolia.basescan.org/)
- [Aptos Testnet Explorer](https://explorer.aptoslabs.com/?network=testnet)
- [Circle Attestation API](https://developers.circle.com/stablecoins/docs/cctp-api-attestation)
- [Petra Wallet](https://petra.app/)
- [MetaMask](https://metamask.io/)

### Contract Addresses

See [Network Configuration](#configuration) section above.

---

## 🛠️ Development

### Project Scripts

```bash
# Start development server
npm start

# Start with cache clear
npm start -- --clear

# Run on specific platform
npm run android
npm run ios
npm run web

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

### Adding New Features

1. **New Screen**: Add file to `app/` directory
2. **New Component**: Add to `components/` directory
3. **New Service**: Add to `services/` directory
4. **New Hook**: Add to `hooks/` directory

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: ESLint + Prettier
- **Naming**: camelCase for variables, PascalCase for components
- **Imports**: Absolute imports preferred

---

## 🐛 Troubleshooting

### Common Issues

#### Wallet Connection Fails

**Problem**: Petra/MetaMask doesn't connect

**Solution**:
- Ensure wallet extension is installed
- Refresh the page
- Check wallet is unlocked
- Try different browser

#### Transaction Fails on Aptos

**Problem**: `receive_usdc()` transaction fails

**Solution**:
- Ensure recipient has USDC registered
- Check sufficient APT for gas
- Verify message and attestation are correct
- Wait longer for attestation

#### Attestation Timeout

**Problem**: Circle attestation takes too long

**Solution**:
- Wait up to 5 minutes
- Check Base transaction was successful
- Verify messageHash is correct
- Retry with same messageHash

#### Amount Mismatch

**Problem**: Received amount differs from sent amount

**Solution**:
- Check for decimal conversion issues
- Verify USDC decimals (6 decimals)
- Ensure no fees were applied

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/improvement`)
3. Test thoroughly on all platforms
4. Commit changes (`git commit -m 'feat: add improvement'`)
5. Push to branch (`git push origin feature/improvement`)
6. Open Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add comments for complex logic
- Test on iOS, Android, and Web
- Update documentation
- Use conventional commits

---

## 📄 License

MIT License - see LICENSE file for details

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: [Full Docs](https://docs.saffron.example)
- **Discord**: [Community](https://discord.gg/saffron)
- **Email**: support@saffron.example

---

## 🗺️ Roadmap

- [x] Base → Aptos USDC transfer
- [x] Petra wallet integration
- [x] OKX wallet integration
- [x] Automatic USDC registration
- [x] Mobile-optimized UI
- [ ] Aptos → Base reverse transfer
- [ ] Transaction history persistence
- [ ] Push notifications
- [ ] Multi-language support
- [ ] Mainnet deployment
- [ ] Additional chains (Arbitrum, Optimism)
- [ ] Batch transfers
- [ ] QR code scanning

---

<div align="center">

**Built with ❤️ using Expo and React Native**

[Website](https://saffron.example) • [Docs](https://docs.saffron.example) • [Twitter](https://twitter.com/saffron)

</div>
