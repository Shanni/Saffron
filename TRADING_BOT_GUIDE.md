# 🤖 Trading Bot Guide

## Overview

A complete automated trading bot with cron jobs for price monitoring and strategy execution on Drift Protocol (Solana).

---

## 🏗️ Architecture

### Components

1. **Price Monitor** (`priceMonitor.ts`)
   - Monitors market prices every 10 seconds
   - Stores price history (last 100 points)
   - Triggers alerts when price conditions met
   - Calculates 24h price changes

2. **Trading Bot** (`tradingBot.ts`)
   - Main bot controller
   - Manages strategy execution
   - Integrates with Drift Protocol
   - Handles cron jobs

3. **Strategy Engine** (`strategyEngine.ts`)
   - Implements 4 trading strategies
   - Calculates technical indicators
   - Manages strategy performance

4. **Drift Service** (`driftService.ts`)
   - Connects to Drift Protocol
   - Executes trades on Solana
   - Manages positions

---

## 📊 Supported Strategies

### 1. DCA (Dollar Cost Averaging)
**Best for:** Long-term accumulation, reducing volatility risk

**How it works:**
- Buys fixed amount at regular intervals
- Ignores price movements
- Averages entry price over time

**Parameters:**
```typescript
{
  type: 'dca',
  dcaInterval: 300,      // Buy every 5 minutes
  dcaAmount: 10,         // $10 per buy
  leverage: 1,           // No leverage (1x)
  stopLoss: 5,          // 5% stop loss
  takeProfit: 10,       // 10% take profit
}
```

**Example:**
```typescript
tradingBot.addStrategy({
  name: 'SOL DCA Strategy',
  type: 'dca',
  market: 'SOL-PERP',
  enabled: true,
  triggerType: 'time',
  triggerInterval: 300,  // Every 5 minutes
  leverage: 1,
  positionSize: 10,
  stopLoss: 5,
  takeProfit: 10,
  dcaInterval: 300,
  dcaAmount: 10,
});
```

---

### 2. Grid Trading
**Best for:** Range-bound markets, capturing volatility

**How it works:**
- Places buy/sell orders at fixed intervals
- Buys when price drops, sells when price rises
- Profits from price oscillations

**Parameters:**
```typescript
{
  type: 'grid',
  gridLevels: 10,           // 10 grid levels
  gridSpacing: 1,           // 1% between levels
  gridRange: {              // Price range
    min: 140,
    max: 150
  },
  leverage: 3,              // 3x leverage
  positionSize: 20,         // $20 per grid
}
```

**Example:**
```typescript
tradingBot.addStrategy({
  name: 'SOL Grid Strategy',
  type: 'grid',
  market: 'SOL-PERP',
  enabled: true,
  triggerType: 'price',
  leverage: 3,
  positionSize: 20,
  stopLoss: 3,
  takeProfit: 5,
  gridLevels: 10,
  gridSpacing: 1,
  gridRange: { min: 140, max: 150 },
});
```

---

### 3. Momentum Trading
**Best for:** Trending markets, riding strong moves

**How it works:**
- Detects price momentum using moving averages
- Buys when momentum is positive
- Sells when momentum is negative

**Parameters:**
```typescript
{
  type: 'momentum',
  momentumPeriod: 20,       // 20 candles for MA
  momentumThreshold: 2,     // 2% momentum required
  leverage: 5,              // 5x leverage
  positionSize: 50,         // $50 per trade
}
```

**Example:**
```typescript
tradingBot.addStrategy({
  name: 'SOL Momentum Strategy',
  type: 'momentum',
  market: 'SOL-PERP',
  enabled: true,
  triggerType: 'indicator',
  leverage: 5,
  positionSize: 50,
  stopLoss: 2,
  takeProfit: 8,
  momentumPeriod: 20,
  momentumThreshold: 2,
});
```

---

### 4. Mean Reversion
**Best for:** Overbought/oversold conditions, range trading

**How it works:**
- Uses RSI to detect extremes
- Buys when oversold (RSI < 30)
- Sells when overbought (RSI > 70)

**Parameters:**
```typescript
{
  type: 'meanReversion',
  rsiPeriod: 14,           // 14 periods for RSI
  rsiOversold: 30,         // Buy below 30
  rsiOverbought: 70,       // Sell above 70
  leverage: 3,             // 3x leverage
  positionSize: 30,        // $30 per trade
}
```

**Example:**
```typescript
tradingBot.addStrategy({
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
  rsiOversold: 30,
  rsiOverbought: 70,
});
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Wallet
```bash
# Create devnet wallet (if not exists)
npm run test:devnet
```

### 3. Test the Bot
```bash
# Run bot test (2 minutes)
npm run bot:test
```

---

## 💻 Usage Examples

### Basic Bot Setup

```typescript
import { tradingBot } from './services/tradingBot';
import { Wallet } from '@coral-xyz/anchor';

// Initialize
await tradingBot.initialize(wallet);

// Add strategies
const dcaId = tradingBot.addStrategy({
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
  dcaInterval: 300,
  dcaAmount: 10,
});

// Start bot
tradingBot.start();

// Check status
const status = tradingBot.getStatus();
console.log(`Running: ${status.isRunning}`);
console.log(`Active Strategies: ${status.activeStrategies}`);

// Stop bot
tradingBot.stop();
```

### Add Price Alerts

```typescript
// Alert when SOL crosses $150
tradingBot.addPriceAlert({
  market: 'SOL-PERP',
  targetPrice: 150,
  condition: 'above',
  strategy: 'momentum',
  isActive: true,
});

// Alert when SOL drops below $140
tradingBot.addPriceAlert({
  market: 'SOL-PERP',
  targetPrice: 140,
  condition: 'below',
  strategy: 'meanReversion',
  isActive: true,
});
```

### Monitor Performance

```typescript
// Get all strategies
const strategies = tradingBot.getStrategies();

strategies.forEach(s => {
  console.log(`${s.name}:`);
  console.log(`  Executions: ${s.totalExecutions}`);
  console.log(`  P&L: $${s.totalPnL}`);
});

// Get price history
import { priceMonitor } from './services/priceMonitor';

const history = priceMonitor.getPriceHistory('SOL-PERP');
console.log(`Latest price: $${history[history.length - 1].price}`);
```

---

## ⚙️ Configuration

### Bot Settings

```typescript
interface BotConfig {
  enabled: boolean;
  monitoringInterval: number;  // seconds
  strategies: BotStrategy[];
}
```

### Strategy Settings

```typescript
interface BotStrategy {
  // Basic
  name: string;
  type: 'dca' | 'grid' | 'momentum' | 'meanReversion';
  market: string;
  enabled: boolean;
  
  // Trigger
  triggerType: 'price' | 'time' | 'indicator';
  triggerPrice?: number;
  triggerCondition?: 'above' | 'below' | 'crosses';
  triggerInterval?: number;
  
  // Risk
  leverage: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  
  // Strategy-specific
  dcaInterval?: number;
  dcaAmount?: number;
  gridLevels?: number;
  gridSpacing?: number;
  momentumPeriod?: number;
  momentumThreshold?: number;
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
}
```

---

## 📈 Strategy Comparison

| Strategy | Leverage | Best Market | Risk Level | Frequency |
|----------|----------|-------------|------------|-----------|
| **DCA** | 1-2x | Any | Low | Hours/Days |
| **Grid** | 3-5x | Range-bound | Medium | Minutes |
| **Momentum** | 5-10x | Trending | High | Minutes |
| **Mean Reversion** | 3-5x | Volatile | Medium | Minutes |

---

## 🔔 Price Monitoring

### How it Works

1. **Cron Job**: Checks prices every 10 seconds
2. **History**: Stores last 100 price points
3. **Alerts**: Triggers when conditions met
4. **Execution**: Calls strategy engine

### Price Alert Types

```typescript
// Above: Trigger when price goes above target
{
  condition: 'above',
  targetPrice: 150
}

// Below: Trigger when price goes below target
{
  condition: 'below',
  targetPrice: 140
}

// Crosses: Trigger when price crosses target
{
  condition: 'crosses',
  targetPrice: 145
}
```

---

## 🛡️ Risk Management

### Built-in Features

1. **Stop Loss**: Automatic exit at loss threshold
2. **Take Profit**: Automatic exit at profit target
3. **Position Sizing**: Fixed USD amounts
4. **Leverage Limits**: Per-strategy max leverage
5. **Cooldown**: Minimum time between trades

### Recommended Settings

**Conservative:**
```typescript
{
  leverage: 1-2,
  stopLoss: 5,
  takeProfit: 10,
  positionSize: 10-50
}
```

**Moderate:**
```typescript
{
  leverage: 3-5,
  stopLoss: 3,
  takeProfit: 6,
  positionSize: 50-100
}
```

**Aggressive:**
```typescript
{
  leverage: 5-10,
  stopLoss: 2,
  takeProfit: 8,
  positionSize: 100-500
}
```

---

## 🧪 Testing

### Test on Devnet

```bash
# Run bot test (safe, no real money)
npm run bot:test
```

### Test Individual Strategies

```typescript
// Test DCA only
const dcaId = tradingBot.addStrategy({
  name: 'Test DCA',
  type: 'dca',
  market: 'SOL-PERP',
  enabled: true,
  triggerType: 'time',
  triggerInterval: 30,  // 30 seconds for testing
  leverage: 1,
  positionSize: 1,      // $1 for testing
  stopLoss: 5,
  takeProfit: 10,
  dcaInterval: 30,
  dcaAmount: 1,
});

tradingBot.start();

// Run for 2 minutes
setTimeout(() => {
  tradingBot.stop();
  const strategy = tradingBot.getStrategies().find(s => s.id === dcaId);
  console.log(`Executions: ${strategy?.totalExecutions}`);
}, 120000);
```

---

## 📊 Monitoring & Logs

### Bot Status

```typescript
const status = tradingBot.getStatus();
console.log(`
  Running: ${status.isRunning}
  Active Strategies: ${status.activeStrategies}
  Total Alerts: ${status.totalAlerts}
  Uptime: ${status.uptime}s
`);
```

### Strategy Performance

```typescript
const strategies = tradingBot.getStrategies();
strategies.forEach(s => {
  console.log(`
    ${s.name}
    Type: ${s.type}
    Executions: ${s.totalExecutions}
    P&L: $${s.totalPnL}
    Last: ${s.lastExecuted}
  `);
});
```

### Price Data

```typescript
const latest = priceMonitor.getLatestPrice('SOL-PERP');
console.log(`
  Price: $${latest?.price}
  Change 24h: ${latest?.change24h}%
  Time: ${latest?.timestamp}
`);
```

---

## 🚨 Common Issues

### 1. Bot Not Executing
**Check:**
- Is bot started? `tradingBot.getStatus().isRunning`
- Are strategies enabled? `strategy.enabled === true`
- Is Drift initialized? `driftService.isReady()`

### 2. No Price Updates
**Check:**
- Is price monitor running? `priceMonitor.isMonitoring()`
- Check network connection
- Verify RPC endpoint

### 3. Strategy Not Triggering
**Check:**
- Trigger conditions met?
- Cooldown period passed?
- Sufficient balance?

---

## 🔧 Advanced Configuration

### Custom Monitoring Interval

```typescript
// Change from 10s to 5s
priceMonitor.stopMonitoring();
// Modify MONITOR_INTERVAL_MS in priceMonitor.ts
priceMonitor.startMonitoring();
```

### Multiple Markets

```typescript
// Add strategies for different markets
tradingBot.addStrategy({ market: 'SOL-PERP', ... });
tradingBot.addStrategy({ market: 'BTC-PERP', ... });
tradingBot.addStrategy({ market: 'ETH-PERP', ... });
```

### Dynamic Strategy Updates

```typescript
// Pause strategy
const strategy = tradingBot.getStrategies()[0];
strategy.enabled = false;

// Change parameters
strategy.leverage = 2;
strategy.positionSize = 20;

// Resume
strategy.enabled = true;
```

---

## 📝 API Reference

### TradingBot

```typescript
// Initialize
await tradingBot.initialize(wallet);

// Control
tradingBot.start();
tradingBot.stop();

// Strategies
tradingBot.addStrategy(config);
tradingBot.removeStrategy(id);
tradingBot.getStrategies();
tradingBot.getActiveStrategies();

// Alerts
tradingBot.addPriceAlert(alert);
tradingBot.getPriceAlerts();

// Status
tradingBot.getStatus();
```

### PriceMonitor

```typescript
// Control
priceMonitor.startMonitoring();
priceMonitor.stopMonitoring();

// Alerts
priceMonitor.addAlert(alert);
priceMonitor.removeAlert(id);
priceMonitor.getAlerts();
priceMonitor.getActiveAlerts();

// Data
priceMonitor.getPriceHistory(market);
priceMonitor.getLatestPrice(market);
```

---

## 🎯 Best Practices

1. **Start Small**: Test with small position sizes first
2. **One Strategy at a Time**: Master one before adding more
3. **Monitor Regularly**: Check bot status and performance
4. **Use Stop Losses**: Always set stop loss limits
5. **Diversify**: Don't put all capital in one strategy
6. **Test on Devnet**: Always test before mainnet
7. **Keep Logs**: Monitor execution logs
8. **Set Alerts**: Use price alerts for important levels

---

## 🚀 Production Deployment

### Checklist

- [ ] Test all strategies on devnet
- [ ] Set appropriate position sizes
- [ ] Configure stop losses
- [ ] Set up monitoring/alerts
- [ ] Fund mainnet wallet
- [ ] Start with one strategy
- [ ] Monitor for 24 hours
- [ ] Gradually add more strategies

### Mainnet Setup

```typescript
// Use mainnet RPC
const MAINNET_RPC = 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY';

// Initialize with mainnet
const driftService = new DriftService(MAINNET_RPC, 'mainnet-beta');
await driftService.initialize(wallet);

// Start bot
await tradingBot.initialize(wallet);
tradingBot.start();
```

---

## 📞 Support

**Commands:**
```bash
npm run bot:test          # Test bot
npm run test:devnet:only  # Test Drift integration
npm test                  # Run all tests
```

**Files:**
- `services/tradingBot.ts` - Main bot
- `services/priceMonitor.ts` - Price monitoring
- `services/driftService.ts` - Drift integration
- `scripts/testTradingBot.ts` - Bot test script

---

**Status: Trading Bot Ready! 🚀**
