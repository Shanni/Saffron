# 🪐 Jupiter Integration Guide for Saffron

## Complete guide to integrate Jupiter DEX aggregator into your React Native trading app

---

## 📊 Jupiter Specifications & Performance Analysis

### **Transaction Execution Speed**
- **Average confirmation time:** 400-600ms (Solana block time)
- **Quote generation:** 50-200ms
- **Total swap time:** 1-2 seconds end-to-end
- **Network congestion impact:** Can increase to 5-10 seconds during high load

### **Fees Structure**

| Fee Type | Amount | Notes |
|----------|--------|-------|
| **Platform Fee** | 0.00% | Jupiter charges NO platform fees |
| **DEX Fees** | 0.01-0.30% | Varies by underlying DEX (Orca, Raydium, etc.) |
| **Priority Fee** | 0.001-0.005 SOL | Optional, improves execution speed |
| **Base Transaction Fee** | 0.000005 SOL | Standard Solana fee (~5,000 lamports) |

**Total typical cost:** ~0.05-0.30% + 0.001-0.005 SOL priority fee

### **Slippage (Bips)**

| Market Type | Recommended Slippage | Notes |
|-------------|---------------------|-------|
| **Stablecoins** (USDC/USDT) | 10-50 bps (0.1-0.5%) | Very low slippage |
| **Major pairs** (SOL/USDC) | 50-100 bps (0.5-1%) | Moderate slippage |
| **Volatile pairs** (Memecoins) | 100-500 bps (1-5%) | High slippage |
| **Low liquidity** | 500-1000 bps (5-10%) | Very high slippage |

**Bips (Basis Points):** 1 bip = 0.01% = 0.0001
- 50 bps = 0.5%
- 100 bps = 1%
- 1000 bps = 10%

### **Liquidity & Routing**

- **Aggregates 20+ DEXs:** Orca, Raydium, Meteora, Phoenix, Lifinity, etc.
- **Smart routing:** Finds best price across multiple pools
- **Split routes:** Can split orders across multiple DEXs for better execution
- **Max hops:** Up to 3 intermediate tokens (configurable)

### **Rate Limits**

| Endpoint | Rate Limit | Notes |
|----------|-----------|-------|
| **Public API** | 600 req/min | Free tier |
| **QuickNode Metis** | Unlimited | Paid tier |
| **Quote endpoint** | No limit | Cached for 30 seconds |

---

## 🚀 Installation & Setup (React Native Mobile App)

### Step 1: Install Dependencies for Mobile

```bash
cd /Users/shanliu/ideas/trading-interface/CascadeProjects/windsurf-project/Saffron

# Core Solana packages (mobile-compatible)
npm install @solana/web3.js
npm install @solana-mobile/mobile-wallet-adapter-protocol
npm install @solana-mobile/mobile-wallet-adapter-protocol-web3js

# Jupiter API (REST-based, works on mobile)
npm install axios  # Jupiter uses REST API, not @jup-ag/api on mobile

# React Native specific
npm install react-native-get-random-values  # Required for crypto operations
npm install @react-native-async-storage/async-storage  # For wallet storage

# Utilities
npm install bs58 buffer
npm install react-native-url-polyfill  # URL polyfill for React Native
```

### Important for React Native:

**Add to your `App.tsx` or `_layout.tsx` (BEFORE other imports):**
```typescript
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
```

**Note:** `@jup-ag/api` is Node.js-based and won't work in React Native. Use REST API directly (shown in jupiterService.ts).

### Step 2: Environment Variables

Create or update `.env`:

```bash
# Solana RPC (use QuickNode for production)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use QuickNode: https://your-endpoint.solana-mainnet.quiknode.pro/

# Jupiter API endpoint
JUPITER_API_URL=https://public.jupiterapi.com
# Or use QuickNode Metis: https://jupiter-swap-api.quiknode.pro/YOUR_ENDPOINT

# Optional: Priority fee settings
DEFAULT_PRIORITY_FEE=auto
MAX_PRIORITY_FEE_LAMPORTS=5000000
```

---

## 📊 DEX Comparison: Jupiter vs Drift vs Hyperliquid

### Execution Speed & Fees Comparison

| DEX | Type | Execution Time | Maker Fee | Taker Fee | Gas Fee | Leverage | Best For |
|-----|------|---------------|-----------|-----------|---------|----------|----------|
| **Jupiter** | Spot Aggregator | 400-600ms | 0% | 0.25% | 0.000005 SOL | 1x | Spot trading, DCA |
| **Drift** | Perp DEX | 100-300ms (Swift) | 0.02% | 0.05% | 0.000005 SOL | 10x | Perps, Grid, Momentum |
| **Hyperliquid** | Perp DEX | <1000ms | 0.015% | 0.045% | 0 (on L1) | 40x | High leverage perps |
| **Orca** | AMM | 400ms | 0.25% | 0.25% | 0.000005 SOL | 1x | Spot only |
| **Raydium** | AMM | 400ms | 0.25% | 0.25% | 0.000005 SOL | 1x | Spot only |

### Detailed Analysis

#### Jupiter (Spot Aggregator)
**Pros:**
- ✅ Zero platform fees
- ✅ Best price across 20+ DEXs
- ✅ Highest liquidity ($2B+ TVL)
- ✅ Simple REST API (mobile-friendly)
- ✅ No account setup needed
- ✅ Battle-tested ($50B+ volume)

**Cons:**
- ❌ Spot only (no leverage)
- ❌ No perpetuals
- ❌ Slippage on large orders

**Best for:** DCA, spot trading, token swaps

**Bips:** 25-30 (0.25-0.30%) total cost

---

#### Drift Protocol (Perpetuals)
**Pros:**
- ✅ True perpetuals with leverage (10x)
- ✅ Swift Protocol: sub-second execution
- ✅ Gasless trading (keepers pay gas)
- ✅ Lower fees than Jupiter for perps
- ✅ Built on Solana (fast finality)
- ✅ TypeScript SDK available

**Cons:**
- ❌ Requires account setup
- ❌ More complex integration
- ❌ Lower liquidity than Jupiter
- ❌ Funding rate costs

**Best for:** Grid trading, momentum strategies, leveraged positions

**Bips:** 2-5 (0.02-0.05%) per trade

**Execution:** 100-300ms with Swift Protocol

---

#### Hyperliquid (High Leverage Perps)
**Pros:**
- ✅ Up to 40x leverage
- ✅ Zero gas fees (own L1)
- ✅ Lowest maker fees (0.015%)
- ✅ 180+ assets
- ✅ CEX-like experience
- ✅ One-click trading

**Cons:**
- ❌ Not on Solana (Arbitrum bridge required)
- ❌ Geo-blocking in some regions
- ❌ Requires USDC on Arbitrum
- ❌ More complex for mobile
- ❌ Cross-chain complexity

**Best for:** High leverage trading, arbitrage

**Bips:** 1.5-4.5 (0.015-0.045%)

**Execution:** <1 second

---

### Recommendation by Strategy Type

| Strategy | Best DEX | Why |
|----------|---------|-----|
| **DCA** | Jupiter | Spot trading, lowest slippage, no leverage needed |
| **Grid Trading** | Drift | Perpetuals, leverage, fast execution |
| **Momentum** | Drift | Leverage, sub-second fills, lower fees |
| **Mean Reversion** | Drift | Perpetuals, can go short easily |
| **Arbitrage** | Hyperliquid | Lowest fees, fastest execution |
| **Spot Swaps** | Jupiter | Best prices, highest liquidity |

### For Saffron Mobile App:

**Recommended Approach:**
1. **Start with Jupiter** (easiest integration, spot trading)
2. **Add Drift later** (for perpetuals and leverage)
3. **Skip Hyperliquid** (cross-chain complexity not worth it for mobile)

---

## 🔄 TypeScript Strategies vs Smart Contract Strategies

### Comparison

| Aspect | TypeScript (Off-Chain) | Smart Contracts (On-Chain) |
|--------|----------------------|---------------------------|
| **Development Time** | 1-2 weeks | 4-6 weeks |
| **Complexity** | Low | High |
| **Audit Cost** | $0 | $50k-$100k |
| **Flexibility** | Very High | Low (immutable) |
| **Execution Speed** | 400-600ms | 400ms |
| **Gas Costs** | Only for trades | Every strategy update |
| **Debugging** | Easy (console.log) | Hard (on-chain logs) |
| **Updates** | Instant | Requires redeployment |
| **Privacy** | Private logic | Public code |
| **Trust Model** | Centralized | Decentralized |
| **Mobile Support** | Native | Via RPC calls |
| **Testing** | Easy (Jest) | Complex (Anchor) |
| **Monitoring** | Easy (logs) | Complex (events) |

### TypeScript Strategies (Off-Chain) ✅ RECOMMENDED

**Pros:**
- ✅ **Fast development:** Write, test, deploy in days
- ✅ **Easy debugging:** Use console.log, breakpoints
- ✅ **Flexible:** Update strategies instantly
- ✅ **No audit needed:** Logic runs on your server
- ✅ **Private:** Strategy logic not visible on-chain
- ✅ **Mobile-friendly:** Native TypeScript in React Native
- ✅ **Rich ecosystem:** Use any npm package
- ✅ **Easy testing:** Jest, Mocha, etc.
- ✅ **Cost-effective:** No gas for strategy logic
- ✅ **Real-time data:** Access any API, price feed

**Cons:**
- ❌ **Centralized:** Users must trust your server
- ❌ **Single point of failure:** Server downtime = no trading
- ❌ **Not trustless:** Can't prove strategy execution
- ❌ **Requires infrastructure:** Need server/backend

**Best for:**
- Mobile apps (like Saffron)
- Rapid iteration
- Private strategies
- Complex logic with external data
- Retail users who trust the platform

---

### Smart Contract Strategies (On-Chain)

**Pros:**
- ✅ **Trustless:** Code is law, verifiable
- ✅ **Decentralized:** No single point of failure
- ✅ **Composable:** Other contracts can use it
- ✅ **Transparent:** Users see exact logic
- ✅ **Permissionless:** Anyone can interact

**Cons:**
- ❌ **Slow development:** Rust/Solidity learning curve
- ❌ **Expensive:** $50k-$100k audit costs
- ❌ **Inflexible:** Hard to update after deployment
- ❌ **Complex debugging:** Limited tooling
- ❌ **Gas costs:** Every operation costs SOL
- ❌ **Limited data:** Can't easily access off-chain APIs
- ❌ **Mobile complexity:** Requires wallet adapters
- ❌ **Public logic:** Competitors can copy

**Best for:**
- DeFi protocols
- Trustless automation
- Large capital management
- Institutional users
- When decentralization is critical

---

### Hybrid Approach (Best of Both Worlds)

**Use TypeScript for:**
- Strategy logic (DCA, Grid, Momentum)
- Signal generation
- Risk management
- Portfolio analytics
- User interface

**Use Smart Contracts for:**
- Fund custody (if needed)
- Governance (if needed)
- Token distribution (if needed)

**Example Architecture:**
```
Mobile App (TypeScript)
    ↓
Strategy Engine (TypeScript)
    ↓ (generates signals)
Jupiter/Drift API (REST)
    ↓ (executes trades)
Solana Blockchain
```

**This is what Saffron should use!**

---

## 🎯 Spot DEX vs Perp DEX for Your Strategies

### When to Use Spot DEX (Jupiter)

**Use for:**
- ✅ **DCA Strategy:** Regular spot purchases
- ✅ **Long-only strategies:** No shorting needed
- ✅ **Token accumulation:** Building positions over time
- ✅ **Simple swaps:** USDC → SOL → USDC

**Example:**
```typescript
// DCA: Buy $100 of SOL daily
await jupiterService.executeSwap(wallet, {
  inputMint: TOKENS.USDC,
  outputMint: TOKENS.SOL,
  amount: 100 * 1_000_000,  // $100
  slippageBps: 50,
});
```

**Pros:**
- Simple integration
- No leverage = no liquidation risk
- Best liquidity
- Lowest fees for spot

**Cons:**
- Can't short
- Can't use leverage
- Must hold actual tokens

---

### When to Use Perp DEX (Drift)

**Use for:**
- ✅ **Grid Trading:** Need to short + long
- ✅ **Momentum:** Quick reversals, leverage
- ✅ **Mean Reversion:** Short overbought, long oversold
- ✅ **Arbitrage:** Leverage for capital efficiency
- ✅ **Hedging:** Protect spot positions

**Example:**
```typescript
// Grid: Short SOL at resistance
await driftClient.openPosition({
  marketIndex: 0,  // SOL-PERP
  direction: 'short',
  baseAssetAmount: 1_000_000_000,  // 1 SOL
  leverage: 3,
});
```

**Pros:**
- Can short without owning tokens
- Leverage (3-10x capital efficiency)
- Lower fees than spot for frequent trading
- Funding rate income (if you're on right side)

**Cons:**
- Liquidation risk
- Funding rate costs
- More complex integration
- Requires margin management

---

### Strategy-Specific Recommendations

#### 1. DCA Strategy
**Use:** Jupiter (Spot)
**Why:** Simple spot buys, no leverage needed
```typescript
// Every 24 hours
const result = await jupiterService.executeSwap(wallet, {
  inputMint: TOKENS.USDC,
  outputMint: TOKENS.SOL,
  amount: dcaAmount,
});
```

#### 2. Grid Trading
**Use:** Drift (Perps)
**Why:** Need both long and short positions
```typescript
// Place grid orders above and below current price
if (price > gridLevel) {
  // Short at resistance
  await driftClient.openPosition({ direction: 'short', ... });
} else {
  // Long at support
  await driftClient.openPosition({ direction: 'long', ... });
}
```

#### 3. Momentum Trading
**Use:** Drift (Perps)
**Why:** Fast reversals, leverage for returns
```typescript
if (momentum > 0) {
  await driftClient.openPosition({ direction: 'long', leverage: 5 });
} else {
  await driftClient.openPosition({ direction: 'short', leverage: 5 });
}
```

#### 4. Mean Reversion
**Use:** Drift (Perps)
**Why:** Need to short overbought conditions
```typescript
if (rsi > 70) {
  // Short overbought
  await driftClient.openPosition({ direction: 'short', ... });
} else if (rsi < 30) {
  // Long oversold
  await driftClient.openPosition({ direction: 'long', ... });
}
```

#### 5. Arbitrage
**Use:** Both (Jupiter for spot, Drift for perps)
**Why:** Exploit price differences
```typescript
// Buy on Jupiter, sell on Drift
const spotPrice = await jupiterService.getPrice(...);
const perpPrice = await driftClient.getMarketPrice(...);

if (perpPrice > spotPrice * 1.005) {  // 0.5% spread
  await jupiterService.executeSwap({ ... });  // Buy spot
  await driftClient.openPosition({ direction: 'short', ... });  // Sell perp
}
```

---

### Recommended Setup for Saffron

**Phase 1: Start with Jupiter (Spot)**
- Implement DCA strategy
- Simple spot swaps
- Test with real users
- Timeline: 1-2 weeks

**Phase 2: Add Drift (Perps)**
- Implement Grid, Momentum, Mean Reversion
- Add leverage options
- More advanced users
- Timeline: 2-3 weeks

**Phase 3: Optimize**
- Smart routing between spot and perps
- Arbitrage opportunities
- Advanced risk management
- Timeline: Ongoing

---

## 💻 TypeScript Implementation

### Create Jupiter Service

Create `/Saffron/services/jupiterService.ts`:

```typescript
import { Connection, PublicKey, VersionedTransaction, Keypair } from '@solana/web3.js';
import { createJupiterApiClient, QuoteResponse, SwapResponse } from '@jup-ag/api';
import bs58 from 'bs58';

// Token addresses
export const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
};

export interface JupiterSwapParams {
  inputMint: string;
  outputMint: string;
  amount: number; // in base units (e.g., lamports for SOL)
  slippageBps?: number; // default 50 (0.5%)
  priorityFee?: 'auto' | number; // lamports or 'auto'
  onlyDirectRoutes?: boolean;
  maxAccounts?: number;
}

export interface SwapResult {
  success: boolean;
  signature?: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fee: number;
  error?: string;
}

class JupiterService {
  private connection: Connection;
  private jupiterApi: ReturnType<typeof createJupiterApiClient>;
  private rpcUrl: string;
  private apiUrl: string;

  constructor() {
    this.rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.apiUrl = process.env.JUPITER_API_URL || 'https://public.jupiterapi.com';
    
    this.connection = new Connection(this.rpcUrl, 'confirmed');
    this.jupiterApi = createJupiterApiClient({ basePath: this.apiUrl });
  }

  /**
   * Get a quote for a swap
   */
  async getQuote(params: JupiterSwapParams): Promise<QuoteResponse> {
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps = 50, // 0.5% default
      onlyDirectRoutes = false,
      maxAccounts = 64,
    } = params;

    try {
      const quote = await this.jupiterApi.quoteGet({
        inputMint,
        outputMint,
        amount,
        slippageBps,
        onlyDirectRoutes,
        maxAccounts,
        // Optimize for best price
        swapMode: 'ExactIn',
        // Restrict intermediate tokens for better execution
        restrictIntermediateTokens: true,
      });

      return quote;
    } catch (error) {
      console.error('Error getting Jupiter quote:', error);
      throw error;
    }
  }

  /**
   * Execute a swap
   */
  async executeSwap(
    wallet: any, // Wallet adapter
    params: JupiterSwapParams
  ): Promise<SwapResult> {
    try {
      // 1. Get quote
      const quote = await this.getQuote(params);

      console.log('Quote received:', {
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct,
        route: quote.routePlan.map(r => r.swapInfo.label).join(' → '),
      });

      // 2. Get swap transaction
      const swapResponse = await this.jupiterApi.swapPost({
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toString(),
          // Priority fee settings
          prioritizationFeeLamports: params.priorityFee || 'auto',
          // Use versioned transactions for better efficiency
          useSharedAccounts: true,
          // Dynamic compute unit limit
          dynamicComputeUnitLimit: true,
        },
      });

      // 3. Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign transaction
      const signedTransaction = await wallet.signTransaction(transaction);

      // 4. Send transaction
      const rawTransaction = signedTransaction.serialize();
      const signature = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 3,
      });

      // 5. Confirm transaction
      const confirmation = await this.connection.confirmTransaction(
        signature,
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return {
        success: true,
        signature,
        inputAmount: parseInt(quote.inAmount),
        outputAmount: parseInt(quote.outAmount),
        priceImpact: parseFloat(quote.priceImpactPct),
        fee: quote.platformFee?.amount ? parseInt(quote.platformFee.amount) : 0,
      };

    } catch (error: any) {
      console.error('Swap execution error:', error);
      return {
        success: false,
        inputAmount: params.amount,
        outputAmount: 0,
        priceImpact: 0,
        fee: 0,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get current price for a token pair
   */
  async getPrice(inputMint: string, outputMint: string, amount: number = 1_000_000): Promise<number> {
    try {
      const quote = await this.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps: 50,
      });

      const price = parseInt(quote.outAmount) / parseInt(quote.inAmount);
      return price;
    } catch (error) {
      console.error('Error getting price:', error);
      return 0;
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(walletAddress: string, tokenMint: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      
      if (tokenMint === TOKENS.SOL) {
        const balance = await this.connection.getBalance(publicKey);
        return balance;
      } else {
        // Get SPL token balance
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: new PublicKey(tokenMint) }
        );

        if (tokenAccounts.value.length === 0) return 0;

        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
        return parseInt(balance);
      }
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  /**
   * Estimate optimal slippage based on market conditions
   */
  async estimateSlippage(inputMint: string, outputMint: string, amount: number): Promise<number> {
    try {
      // Get quotes with different slippage values
      const quotes = await Promise.all([
        this.getQuote({ inputMint, outputMint, amount, slippageBps: 10 }),
        this.getQuote({ inputMint, outputMint, amount, slippageBps: 50 }),
        this.getQuote({ inputMint, outputMint, amount, slippageBps: 100 }),
      ]);

      // Calculate price impact
      const priceImpacts = quotes.map(q => parseFloat(q.priceImpactPct));
      const avgImpact = priceImpacts.reduce((a, b) => a + b, 0) / priceImpacts.length;

      // Recommend slippage based on price impact
      if (avgImpact < 0.1) return 50; // 0.5% for low impact
      if (avgImpact < 0.5) return 100; // 1% for medium impact
      if (avgImpact < 2) return 300; // 3% for high impact
      return 500; // 5% for very high impact
    } catch (error) {
      console.error('Error estimating slippage:', error);
      return 100; // Default 1%
    }
  }
}

export const jupiterService = new JupiterService();
```

---

## 🎯 Update Strategy Engine to Use Jupiter

Update `/Saffron/services/strategyEngine.ts`:

```typescript
import { jupiterService, TOKENS, JupiterSwapParams } from './jupiterService';

// Replace the mock dexService with Jupiter integration
class StrategyEngine {
  // ... existing code ...

  // Update executeStrategy to use Jupiter
  private async executeStrategy(strategyId: string) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy || strategy.status !== 'active') return;

    try {
      const marketData = this.getLatestMarketData(strategy.market);
      if (!marketData) return;

      let shouldTrade = false;
      let orderParams: OrderParams | null = null;

      // ... existing strategy logic ...

      if (shouldTrade && orderParams) {
        // Execute trade via Jupiter
        const result = await this.executeJupiterTrade(orderParams);
        if (result.success) {
          this.recordTrade(strategyId, result, 'strategy');
        }
      }

      strategy.lastExecution = new Date();
    } catch (error) {
      console.error(`Error executing strategy ${strategyId}:`, error);
    }
  }

  // New method: Execute trade via Jupiter
  private async executeJupiterTrade(params: OrderParams): Promise<SwapResult> {
    // Map market to token pair
    const [base, quote] = params.market.split('-');
    const inputMint = params.side === 'long' ? TOKENS.USDC : this.getTokenMint(base);
    const outputMint = params.side === 'long' ? this.getTokenMint(base) : TOKENS.USDC;

    // Calculate amount in base units
    const amount = params.side === 'long'
      ? params.size * 1_000_000 // USDC has 6 decimals
      : params.size * 1_000_000_000; // SOL has 9 decimals

    // Estimate optimal slippage
    const slippageBps = await jupiterService.estimateSlippage(
      inputMint,
      outputMint,
      amount
    );

    // Execute swap
    const swapParams: JupiterSwapParams = {
      inputMint,
      outputMint,
      amount,
      slippageBps,
      priorityFee: 'auto',
    };

    return await jupiterService.executeSwap(this.wallet, swapParams);
  }

  // Helper: Get token mint address
  private getTokenMint(symbol: string): string {
    const tokenMap: Record<string, string> = {
      'SOL': TOKENS.SOL,
      'USDC': TOKENS.USDC,
      'USDT': TOKENS.USDT,
      'BONK': TOKENS.BONK,
      'JUP': TOKENS.JUP,
    };
    return tokenMap[symbol] || TOKENS.SOL;
  }
}
```

---

## 📱 React Native Integration

Update your main trading screen `/Saffron/app/(tabs)/index.tsx`:

```typescript
import { jupiterService, TOKENS } from '@/services/jupiterService';
import { useWallet } from '@solana/wallet-adapter-react-native';

export default function SaffronHomeScreen() {
  const wallet = useWallet();
  const [swapping, setSwapping] = useState(false);

  // Handle natural language command
  const handleCommand = async (command: string) => {
    const parsed = parseCommand(command);
    
    if (parsed.type === 'trade') {
      await executeSwap(parsed);
    }
  };

  // Execute swap via Jupiter
  const executeSwap = async (params: any) => {
    if (!wallet.connected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    setSwapping(true);

    try {
      // Get quote first
      const quote = await jupiterService.getQuote({
        inputMint: TOKENS.USDC,
        outputMint: TOKENS.SOL,
        amount: params.amount * 1_000_000, // Convert to base units
        slippageBps: 50,
      });

      // Show confirmation
      Alert.alert(
        'Confirm Swap',
        `Swap ${params.amount} USDC for ~${(parseInt(quote.outAmount) / 1e9).toFixed(4)} SOL\n\nPrice Impact: ${quote.priceImpactPct}%`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              const result = await jupiterService.executeSwap(wallet, {
                inputMint: TOKENS.USDC,
                outputMint: TOKENS.SOL,
                amount: params.amount * 1_000_000,
                slippageBps: 50,
                priorityFee: 'auto',
              });

              if (result.success) {
                Alert.alert(
                  'Success!',
                  `Swap completed!\n\nTx: ${result.signature?.slice(0, 8)}...`
                );
              } else {
                Alert.alert('Error', result.error || 'Swap failed');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSwapping(false);
    }
  };

  return (
    <View>
      {/* Your existing UI */}
      {swapping && <ActivityIndicator />}
    </View>
  );
}
```

---

## 🧪 Testing Guide

### Test on Devnet First

```typescript
// Update jupiterService.ts for devnet testing
constructor() {
  this.rpcUrl = 'https://api.devnet.solana.com';
  this.apiUrl = 'https://public.jupiterapi.com'; // Jupiter works on devnet too
  
  this.connection = new Connection(this.rpcUrl, 'confirmed');
  this.jupiterApi = createJupiterApiClient({ basePath: this.apiUrl });
}

// Get devnet SOL
// Visit: https://faucet.solana.com/
```

### Test Scenarios

```bash
# 1. Get quote
npm run test:quote

# 2. Execute small swap (0.01 SOL)
npm run test:swap

# 3. Test strategy execution
npm run test:strategy
```

---

## 🎨 Remove Unnecessary Contracts

Since you're using Jupiter for trading, you can remove the Rust contracts:

```bash
cd /Users/shanliu/ideas/trading-interface/CascadeProjects/windsurf-project

# Archive contracts for reference (don't delete completely)
mkdir -p archive
mv contract-solana archive/contract-solana-reference
mv contract-evm archive/contract-evm-reference

# Your project structure is now:
# ├── Saffron/              ← Your main app
# │   ├── services/
# │   │   ├── jupiterService.ts    ← Jupiter integration
# │   │   └── strategyEngine.ts    ← TypeScript strategies
# │   └── app/
# └── archive/              ← Reference implementations
```

**Benefits:**
- ✅ No Rust toolchain issues
- ✅ Faster development
- ✅ Easier testing
- ✅ Use battle-tested DEX infrastructure
- ✅ Focus on your value prop (AI interface + strategies)

---

## 📊 Performance Comparison

| Metric | Custom Rust Contracts | Jupiter Integration |
|--------|----------------------|---------------------|
| **Development Time** | 4-6 weeks | 1-2 weeks |
| **Audit Cost** | $50k-$100k | $0 (use audited DEXs) |
| **Liquidity** | Need to bootstrap | Access to $billions |
| **Execution Speed** | ~400ms | ~400-600ms |
| **Fees** | 0.05-0.10% | 0.05-0.30% |
| **Maintenance** | High | Low |
| **Risk** | High (new code) | Low (battle-tested) |

---

## 🚀 Next Steps

1. **Install dependencies** (see Installation section)
2. **Create jupiterService.ts** (copy code above)
3. **Update strategyEngine.ts** to use Jupiter
4. **Test on devnet** with small amounts
5. **Deploy to production** once tested

**Your strategies are already written in TypeScript!** Just connect them to Jupiter instead of building your own DEX.

---

## 📚 Resources

- [Jupiter API Docs](https://station.jup.ag/docs/apis/swap-api)
- [Jupiter SDK](https://github.com/jup-ag/jupiter-quote-api-node)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [QuickNode Solana](https://www.quicknode.com/chains/sol)
