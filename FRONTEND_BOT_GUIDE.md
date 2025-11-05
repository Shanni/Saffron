# 🎨 Frontend Bot Execution Guide

## Overview

Frontend-focused bot execution service with **real market data from CoinGecko** and strategy execution on Drift Protocol.

---

## 🆕 What's New

### 1. **CoinGecko Integration** 📊
- ✅ Real-time price data (free API, no key needed)
- ✅ 30-second caching to avoid rate limits
- ✅ Supports SOL, BTC, ETH, BONK, JUP
- ✅ Fallback to Drift/mock prices if needed

### 2. **Frontend Bot Service** 🎨
- ✅ Runs in React Native/frontend
- ✅ Automatic price updates every 10 seconds
- ✅ Strategy execution with indicators
- ✅ Execution history tracking
- ✅ Real-time state management

### 3. **Devnet RPC** 🌐
- ✅ Using `https://solana-devnet.api.onfinality.io/public`
- ✅ Better reliability than default devnet RPC
- ✅ Configured across all services

---

## 🏗️ Architecture

```
CoinGecko API (Real Prices)
    ↓
Bot Execution Service (Frontend)
    ↓
Strategy Logic (DCA, Grid, Momentum, Mean Reversion)
    ↓
Drift Protocol (Solana Devnet)
    ↓
Trade Execution
```

---

## 📦 New Services

### 1. CoinGecko Service (`coinGeckoService.ts`)

**Features:**
- Real-time price data
- 30-second caching
- Multiple symbol support
- Historical data
- Error handling with fallbacks

**Usage:**
```typescript
import { coinGeckoService } from './services/coinGeckoService';

// Get single price
const price = await coinGeckoService.getPrice('SOL-PERP');
console.log(`SOL: $${price}`);

// Get detailed data
const data = await coinGeckoService.getSimplePrice('SOL-PERP');
console.log(`Price: $${data.price}`);
console.log(`24h Change: ${data.change24h}%`);
console.log(`24h High: $${data.high24h}`);
console.log(`24h Low: $${data.low24h}`);

// Get multiple prices
const prices = await coinGeckoService.getMultiplePrices([
  'SOL-PERP',
  'BTC-PERP',
  'ETH-PERP'
]);

// Get historical prices
const history = await coinGeckoService.getHistoricalPrices('SOL-PERP', 1);
```

### 2. Bot Execution Service (`botExecutionService.ts`)

**Features:**
- Frontend-optimized execution
- Real-time price monitoring
- Indicator calculations (RSI, Momentum)
- Strategy management
- Execution history

**Usage:**
```typescript
import { botExecutionService } from './services/botExecutionService';

// Add strategy
const strategyId = botExecutionService.addStrategy({
  name: 'My DCA Strategy',
  type: 'dca',
  market: 'SOL-PERP',
  enabled: true,
  triggerType: 'time',
  triggerInterval: 300,
  leverage: 1,
  positionSize: 10,
  stopLoss: 5,
  takeProfit: 10,
  dcaAmount: 10,
  dcaInterval: 300,
});

// Start bot
botExecutionService.start();

// Get state
const state = botExecutionService.getState();
console.log(`Running: ${state.isRunning}`);
console.log(`Strategies: ${state.strategies.length}`);

// Get current price
const priceData = botExecutionService.getCurrentPrice('SOL-PERP');
console.log(`SOL: $${priceData?.price}`);

// Manual execution
await botExecutionService.manualExecute(strategyId);

// Stop bot
botExecutionService.stop();
```

---

## 🚀 Quick Start

### 1. Test CoinGecko
```bash
# In Node.js or test script
import { coinGeckoService } from './services/coinGeckoService';

const price = await coinGeckoService.getPrice('SOL-PERP');
console.log(`SOL: $${price}`);
```

### 2. Test Frontend Bot
```bash
npm run bot:frontend
```

This will:
- Initialize Drift on devnet
- Fetch real prices from CoinGecko
- Add 4 strategies (DCA, Grid, Momentum, Mean Reversion)
- Run for 2 minutes
- Show execution results

---

## 📊 CoinGecko vs Drift Prices

### Price Source Priority

1. **CoinGecko** (Primary)
   - Real-time market data
   - Free API
   - 30-second cache
   - Reliable

2. **Drift Protocol** (Fallback)
   - On-chain prices
   - May not be available on devnet
   - Used if CoinGecko fails

3. **Mock Prices** (Last Resort)
   - Static fallback values
   - Only if both above fail

### Example Output

```
📊 Updating prices for 3 markets...
✅ Real price from CoinGecko: $145.23
   SOL-PERP: $145.23 (+2.34%)
✅ Real price from CoinGecko: $67234.56
   BTC-PERP: $67234.56 (+1.12%)
✅ Real price from CoinGecko: $3456.78
   ETH-PERP: $3456.78 (-0.45%)
```

---

## 🎨 Frontend Integration

### React Native Component

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { botExecutionService } from '@/services/botExecutionService';

export default function BotScreen() {
  const [state, setState] = useState(botExecutionService.getState());
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Update state every 5 seconds
    const interval = setInterval(() => {
      setState(botExecutionService.getState());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    botExecutionService.start();
    setIsRunning(true);
  };

  const handleStop = () => {
    botExecutionService.stop();
    setIsRunning(false);
  };

  return (
    <View>
      <Text>Bot Status: {state.isRunning ? 'Running' : 'Stopped'}</Text>
      <Text>Active Strategies: {state.strategies.filter(s => s.enabled).length}</Text>
      
      {/* Price Display */}
      {Array.from(state.priceData.entries()).map(([symbol, data]) => (
        <View key={symbol}>
          <Text>{symbol}: ${data.price.toFixed(2)}</Text>
          <Text>24h: {data.change24h > 0 ? '+' : ''}{data.change24h.toFixed(2)}%</Text>
        </View>
      ))}

      {/* Controls */}
      <Button 
        title={isRunning ? 'Stop Bot' : 'Start Bot'} 
        onPress={isRunning ? handleStop : handleStart} 
      />

      {/* Strategies */}
      {state.strategies.map(strategy => (
        <View key={strategy.id}>
          <Text>{strategy.name}</Text>
          <Text>Executions: {strategy.totalExecutions}</Text>
          <Text>P&L: ${strategy.totalPnL.toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}
```

---

## 🔧 Configuration

### Devnet RPC

All services now use:
```typescript
const DEVNET_RPC = 'https://solana-devnet.api.onfinality.io/public';
```

**Files updated:**
- `services/driftService.ts`
- `scripts/testBotExecution.ts`
- `scripts/testTradingBot.ts`

### CoinGecko Cache

```typescript
// Default: 30 seconds
private readonly CACHE_DURATION = 30000;

// Clear cache manually
coinGeckoService.clearCache();

// Check cache stats
const stats = coinGeckoService.getCacheStats();
console.log(`Cached symbols: ${stats.symbols.join(', ')}`);
```

---

## 📈 Strategy Examples

### DCA with Real Prices

```typescript
botExecutionService.addStrategy({
  name: 'SOL DCA',
  type: 'dca',
  market: 'SOL-PERP',
  enabled: true,
  triggerType: 'time',
  triggerInterval: 300,  // Every 5 minutes
  leverage: 1,
  positionSize: 10,
  stopLoss: 5,
  takeProfit: 10,
  dcaAmount: 10,
  dcaInterval: 300,
});
```

### Momentum with Indicators

```typescript
botExecutionService.addStrategy({
  name: 'SOL Momentum',
  type: 'momentum',
  market: 'SOL-PERP',
  enabled: true,
  triggerType: 'indicator',
  leverage: 5,
  positionSize: 50,
  stopLoss: 2,
  takeProfit: 8,
  momentumPeriod: 20,      // 20 price points
  momentumThreshold: 2,    // 2% momentum
});
```

### Mean Reversion with RSI

```typescript
botExecutionService.addStrategy({
  name: 'SOL Mean Reversion',
  type: 'meanReversion',
  market: 'SOL-PERP',
  enabled: true,
  triggerType: 'indicator',
  leverage: 3,
  positionSize: 30,
  stopLoss: 3,
  takeProfit: 6,
  rsiPeriod: 14,
  rsiOversold: 30,         // Buy when RSI < 30
  rsiOverbought: 70,       // Sell when RSI > 70
});
```

---

## 🧪 Testing

### Test CoinGecko

```bash
# In Node.js REPL or script
node
> const { coinGeckoService } = require('./services/coinGeckoService');
> await coinGeckoService.getPrice('SOL-PERP');
145.23
```

### Test Frontend Bot

```bash
npm run bot:frontend
```

**What it does:**
1. Fetches real prices from CoinGecko
2. Initializes Drift on devnet
3. Adds 4 strategies
4. Runs for 2 minutes
5. Shows execution results

---

## 📊 Monitoring

### Real-time Updates

```typescript
// Get current state
const state = botExecutionService.getState();

// Price data
state.priceData.forEach((data, symbol) => {
  console.log(`${symbol}: $${data.price} (${data.change24h}%)`);
});

// Strategy status
state.strategies.forEach(s => {
  console.log(`${s.name}: ${s.status}`);
  console.log(`  Executions: ${s.totalExecutions}`);
  console.log(`  P&L: $${s.totalPnL}`);
});

// Execution history
const history = botExecutionService.getExecutionHistory(10);
history.forEach(e => {
  console.log(`${e.success ? '✅' : '❌'} ${e.direction} @ $${e.price}`);
});
```

---

## 🔍 Debugging

### Check Price Source

```typescript
// Try to get price
const price = await driftService.getMarketPrice(0);

// Console output will show:
// ✅ Real price from CoinGecko: $145.23
// OR
// ⚠️  CoinGecko failed: Rate limit exceeded
// ✅ Real price from Drift: $145.50
// OR
// ⚠️  Using fallback price for market 0 on devnet
```

### Check Bot State

```typescript
const state = botExecutionService.getState();
console.log('Bot State:', {
  isRunning: state.isRunning,
  strategies: state.strategies.length,
  priceDataSize: state.priceData.size,
  executionHistory: state.executionHistory.length,
});
```

---

## 🚨 Common Issues

### 1. CoinGecko Rate Limit
**Error:** `Rate limit exceeded`  
**Solution:** Wait 60 seconds or use cache

### 2. No Price Data
**Check:**
- Is bot started? `botExecutionService.getState().isRunning`
- Is CoinGecko accessible?
- Check cache: `coinGeckoService.getCacheStats()`

### 3. Strategy Not Executing
**Check:**
- Is strategy enabled? `strategy.enabled === true`
- Has cooldown passed? Check `strategy.lastExecuted`
- Are trigger conditions met?

---

## 📝 API Reference

### CoinGeckoService

```typescript
// Get price
await coinGeckoService.getPrice(symbol: string): Promise<number>

// Get detailed data
await coinGeckoService.getSimplePrice(symbol: string): Promise<SimplePriceData>

// Get multiple prices
await coinGeckoService.getMultiplePrices(symbols: string[]): Promise<Map<string, SimplePriceData>>

// Get historical data
await coinGeckoService.getHistoricalPrices(symbol: string, days: number): Promise<Array<{timestamp: Date, price: number}>>

// Cache management
coinGeckoService.clearCache(): void
coinGeckoService.getCacheStats(): {size: number, symbols: string[]}

// Utilities
coinGeckoService.isSupported(symbol: string): boolean
coinGeckoService.getSupportedSymbols(): string[]
```

### BotExecutionService

```typescript
// Control
botExecutionService.start(): void
botExecutionService.stop(): void

// Strategies
botExecutionService.addStrategy(config): string
botExecutionService.removeStrategy(id: string): boolean
botExecutionService.updateStrategy(id: string, updates): boolean
botExecutionService.getStrategies(): Strategy[]
botExecutionService.getStrategy(id: string): Strategy | undefined

// Execution
await botExecutionService.manualExecute(strategyId: string): Promise<ExecutionResult>

// State
botExecutionService.getState(): BotState
botExecutionService.getCurrentPrice(market: string): SimplePriceData | undefined
botExecutionService.getExecutionHistory(limit?: number): ExecutionResult[]
botExecutionService.clearHistory(): void
```

---

## 🎉 Summary

### ✅ What's Working

1. **Real Market Data** - CoinGecko integration
2. **Frontend Bot** - React Native compatible
3. **4 Strategies** - DCA, Grid, Momentum, Mean Reversion
4. **Devnet Testing** - Safe testing environment
5. **Real-time Updates** - 10-second price refresh
6. **Execution Tracking** - Full history

### 📦 New Files

- `services/coinGeckoService.ts` - CoinGecko API integration
- `services/botExecutionService.ts` - Frontend bot execution
- `scripts/testBotExecution.ts` - Frontend bot test
- `FRONTEND_BOT_GUIDE.md` - This guide

### 🚀 Commands

```bash
# Test frontend bot
npm run bot:frontend

# Test backend bot (original)
npm run bot:test

# Test devnet
npm run test:devnet:only
```

---

**Status: Frontend Bot Ready with Real Market Data! 🎨📊**
