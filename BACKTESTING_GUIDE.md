# 📊 Backtesting Guide

## Overview

Complete backtesting system that tests all 4 strategies against 7 days of historical data from CoinGecko.

---

## 🎯 What's New

### 1. **Backtesting Service** (`strategies/backtesting.ts`)
- ✅ Tests strategies against historical data
- ✅ Supports all 4 strategies (DCA, Grid, Momentum, Mean Reversion)
- ✅ Calculates comprehensive performance metrics
- ✅ Tracks equity curve and drawdowns

### 2. **CoinGecko Auto-Update** (Updated)
- ✅ Fetches prices every 30 seconds automatically
- ✅ `startAutoUpdate()` and `stopAutoUpdate()` methods
- ✅ Integrated into bot execution

### 3. **All Strategies Enabled** (Updated)
- ✅ All 4 strategies now run in `testBotExecution`
- ✅ Grid strategy enabled for testing
- ✅ Real-time execution with all strategies

---

## 🚀 Quick Start

### Run Backtesting

```bash
# Backtest all strategies on 7 days of data
npm run backtest
```

**What it does:**
1. Fetches 7 days of SOL price history from CoinGecko
2. Runs all 4 strategies against the data
3. Calculates performance metrics
4. Compares strategies side-by-side
5. Recommends best strategy

---

## 📊 Backtest Output

### Example Results

```
🔬 STRATEGY BACKTESTING - 7 DAYS

Market: SOL-PERP
Period: 2025-10-13 to 2025-10-20
Initial Capital: $1000

═══════════════════════════════════════════════════════
1️⃣  DCA STRATEGY
═══════════════════════════════════════════════════════

Fetching 7 days of historical data...
✅ Fetched 168 price points

📈 PERFORMANCE
Initial Capital: $1000.00
Final Capital: $1045.23
Total Return: $45.23 (4.52%)
Max Drawdown: $23.45 (2.35%)

📊 TRADE STATISTICS
Total Trades: 14
Winning Trades: 9 (64.29%)
Losing Trades: 5

💰 PROFIT/LOSS
Average Win: $8.34
Average Loss: $3.21
Largest Win: $15.67
Largest Loss: $6.54

📉 RISK METRICS
Sharpe Ratio: 1.23
Profit Factor: 2.34

═══════════════════════════════════════════════════════
```

### Strategy Comparison Table

```
┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Strategy        │ Return % │ Win Rate │ Sharpe   │ Trades   │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ dca             │    4.52% │   64.3% │    1.23  │     14  │
│ grid            │    6.78% │   58.7% │    1.45  │     32  │
│ momentum        │    8.91% │   52.4% │    1.67  │     21  │
│ meanReversion   │    5.34% │   61.2% │    1.34  │     18  │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘

🏆 BEST STRATEGY: MOMENTUM
   Return: 8.91%
   Win Rate: 52.4%
   Sharpe Ratio: 1.67
   Max Drawdown: 3.45%
```

---

## 📈 Performance Metrics Explained

### Return Metrics
- **Total Return**: Profit/loss in dollars
- **Total Return %**: Percentage gain/loss
- **Final Capital**: Ending portfolio value

### Trade Metrics
- **Total Trades**: Number of completed trades
- **Winning Trades**: Trades with profit
- **Losing Trades**: Trades with loss
- **Win Rate**: Percentage of winning trades

### Risk Metrics
- **Max Drawdown**: Largest peak-to-trough decline
- **Sharpe Ratio**: Risk-adjusted returns (>1 is good)
- **Profit Factor**: Gross profit / Gross loss (>1 is profitable)

### Trade Analysis
- **Average Win**: Average profit per winning trade
- **Average Loss**: Average loss per losing trade
- **Largest Win**: Best single trade
- **Largest Loss**: Worst single trade

---

## 🎯 Strategy Configurations

### DCA Strategy
```typescript
{
  strategy: 'dca',
  initialCapital: 1000,
  leverage: 1,
  positionSize: 50,
  stopLoss: 5,
  takeProfit: 10,
  dcaAmount: 50,
  dcaInterval: 12, // Every 12 hours
}
```

### Grid Strategy
```typescript
{
  strategy: 'grid',
  initialCapital: 1000,
  leverage: 3,
  positionSize: 100,
  stopLoss: 3,
  takeProfit: 5,
  gridLevels: 10,
  gridSpacing: 1,
}
```

### Momentum Strategy
```typescript
{
  strategy: 'momentum',
  initialCapital: 1000,
  leverage: 5,
  positionSize: 200,
  stopLoss: 2,
  takeProfit: 8,
  momentumPeriod: 20,
  momentumThreshold: 2,
}
```

### Mean Reversion Strategy
```typescript
{
  strategy: 'meanReversion',
  initialCapital: 1000,
  leverage: 3,
  positionSize: 150,
  stopLoss: 3,
  takeProfit: 6,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
}
```

---

## 🔧 Custom Backtesting

### Run Custom Backtest

```typescript
import { backtestingService, BacktestConfig } from './strategies/backtesting';

const config: BacktestConfig = {
  strategy: 'dca',
  market: 'SOL-PERP',
  startDate: new Date('2025-10-13'),
  endDate: new Date('2025-10-20'),
  initialCapital: 1000,
  leverage: 1,
  positionSize: 50,
  stopLoss: 5,
  takeProfit: 10,
  dcaAmount: 50,
  dcaInterval: 12,
};

const result = await backtestingService.runBacktest(config);
backtestingService.printResults(result);
```

### Different Time Periods

```typescript
// Last 30 days
const endDate = new Date();
const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

// Specific date range
const startDate = new Date('2025-09-01');
const endDate = new Date('2025-10-01');
```

### Different Markets

```typescript
// Test on BTC
const config = {
  ...otherConfig,
  market: 'BTC-PERP',
};

// Test on ETH
const config = {
  ...otherConfig,
  market: 'ETH-PERP',
};
```

---

## 🔄 CoinGecko Auto-Update

### How It Works

CoinGecko now automatically fetches prices every 30 seconds when enabled:

```typescript
import { coinGeckoService } from './services/coinGeckoService';

// Start auto-update
coinGeckoService.startAutoUpdate(['SOL-PERP', 'BTC-PERP', 'ETH-PERP']);

// Prices are automatically updated every 30 seconds
// ✅ Prices updated: SOL-PERP, BTC-PERP, ETH-PERP

// Stop auto-update
coinGeckoService.stopAutoUpdate();
```

### In Bot Execution

Auto-update is now integrated into the bot test:

```typescript
// In testBotExecution.ts
coinGeckoService.startAutoUpdate(['SOL-PERP', 'BTC-PERP', 'ETH-PERP']);
botExecutionService.start();

// Bot runs with fresh prices every 30 seconds

coinGeckoService.stopAutoUpdate();
botExecutionService.stop();
```

---

## 🎨 All Strategies Enabled

### Updated Test

The `testBotExecution` script now runs **all 4 strategies**:

```bash
npm run bot:frontend
```

**What's enabled:**
- ✅ DCA Strategy (time-based, every 30s)
- ✅ Grid Strategy (price-based)
- ✅ Momentum Strategy (indicator-based)
- ✅ Mean Reversion Strategy (indicator-based)

**What you'll see:**
```
📊 ACTIVE STRATEGIES

1. SOL DCA
   Type: dca
   Leverage: 1x
   Position Size: $10
   Trigger: time
   Status: idle

2. SOL Grid
   Type: grid
   Leverage: 3x
   Position Size: $20
   Trigger: price
   Status: idle

3. SOL Momentum
   Type: momentum
   Leverage: 5x
   Position Size: $50
   Trigger: indicator
   Status: idle

4. SOL Mean Reversion
   Type: meanReversion
   Leverage: 3x
   Position Size: $30
   Trigger: indicator
   Status: idle
```

---

## 📊 Interpreting Results

### Good Strategy Indicators

✅ **Positive Return**: Total return > 0%  
✅ **High Win Rate**: > 50%  
✅ **Good Sharpe Ratio**: > 1.0  
✅ **Low Drawdown**: < 10%  
✅ **High Profit Factor**: > 1.5  

### Warning Signs

⚠️ **Moderate Win Rate**: 40-50%  
⚠️ **Moderate Sharpe**: 0.5-1.0  
⚠️ **Moderate Drawdown**: 10-20%  

### Red Flags

❌ **Negative Return**: Total return < 0%  
❌ **Low Win Rate**: < 40%  
❌ **Poor Sharpe**: < 0.5  
❌ **High Drawdown**: > 20%  

---

## 💡 Optimization Tips

### Improve DCA
- Adjust `dcaInterval` based on market volatility
- Increase `dcaAmount` in strong trends
- Tighten `stopLoss` in choppy markets

### Improve Grid
- Increase `gridLevels` in ranging markets
- Widen `gridSpacing` in volatile markets
- Adjust range based on support/resistance

### Improve Momentum
- Increase `momentumPeriod` for smoother signals
- Raise `momentumThreshold` to filter noise
- Use tighter `stopLoss` for higher leverage

### Improve Mean Reversion
- Adjust `rsiPeriod` for different timeframes
- Tighten `rsiOversold`/`rsiOverbought` for stronger signals
- Use wider `takeProfit` to capture full reversions

---

## 🔬 Advanced Analysis

### Equity Curve

Access the equity curve from results:

```typescript
const result = await backtestingService.runBacktest(config);

// Plot equity over time
result.equity.forEach(point => {
  console.log(`${point.timestamp.toISOString()}: $${point.value.toFixed(2)}`);
});
```

### Trade Analysis

Analyze individual trades:

```typescript
// Get all trades
result.trades.forEach(trade => {
  console.log(`${trade.timestamp}: ${trade.type} ${trade.side} @ $${trade.price}`);
  if (trade.pnl) {
    console.log(`  P&L: $${trade.pnl.toFixed(2)}`);
  }
});

// Filter winning trades
const winners = result.trades.filter(t => t.pnl && t.pnl > 0);

// Filter losing trades
const losers = result.trades.filter(t => t.pnl && t.pnl < 0);
```

---

## 📝 Commands Summary

```bash
# Run backtesting (7 days, all strategies)
npm run backtest

# Run frontend bot (all strategies enabled)
npm run bot:frontend

# Run backend bot
npm run bot:test

# Test devnet
npm run test:devnet:only
```

---

## 🎯 Next Steps

### 1. Analyze Results
- Review backtest performance
- Identify best strategy
- Note optimal parameters

### 2. Optimize Parameters
- Adjust based on backtest results
- Test different configurations
- Find best risk/reward balance

### 3. Forward Test
- Run live bot with best strategy
- Monitor real-time performance
- Compare to backtest results

### 4. Deploy
- Start with small position sizes
- Gradually increase as confidence grows
- Monitor and adjust continuously

---

## 📊 Files Created/Updated

### New Files
- ✅ `strategies/backtesting.ts` - Backtesting service
- ✅ `scripts/runBacktest.ts` - Backtest runner
- ✅ `BACKTESTING_GUIDE.md` - This guide

### Updated Files
- ✅ `services/coinGeckoService.ts` - Auto-update every 30s
- ✅ `scripts/testBotExecution.ts` - All strategies enabled
- ✅ `package.json` - Added `backtest` command

---

**Status: Backtesting System Complete! 📊**

Test your strategies against historical data before risking real capital!
