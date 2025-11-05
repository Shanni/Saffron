// Run Backtesting for All Strategies
// Tests strategies against configurable historical data

import { writeFile } from 'fs/promises';
import path from 'path';
import { coinGeckoService } from '../services/coinGeckoService';
import { BacktestConfig, backtestingService, BacktestResult } from '../strategies/backtesting';

interface BacktestOptions {
  market: string;
  days: number;
}

interface PricePoint {
  timestamp: Date;
  price: number;
}

interface PriceSummary {
  min: number;
  max: number;
  start: number;
  end: number;
}

const DEFAULT_MARKET = 'SOL-PERP';
const DEFAULT_DAYS = 7;

const COIN_ALIAS_MAP: Record<string, string> = {
  sol: 'SOL-PERP',
  solana: 'SOL-PERP',
  'sol-perp': 'SOL-PERP',
  btc: 'BTC-PERP',
  bitcoin: 'BTC-PERP',
  'btc-perp': 'BTC-PERP',
  eth: 'ETH-PERP',
  ethereum: 'ETH-PERP',
  'eth-perp': 'ETH-PERP',
  bonk: 'BONK-PERP',
  'bonk-perp': 'BONK-PERP',
  jup: 'JUP-PERP',
  'jup-perp': 'JUP-PERP',
};

function parseArgs(): BacktestOptions {
  const [marketArg, daysArg] = process.argv.slice(2);
  const market = resolveMarket(marketArg);

  let days = DEFAULT_DAYS;
  if (daysArg !== undefined) {
    const parsed = Number.parseInt(daysArg, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      throw new Error(`Invalid number of days: ${daysArg}`);
    }
    days = parsed;
  }

  return { market, days };
}

function resolveMarket(input?: string): string {
  if (!input) {
    return DEFAULT_MARKET;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return DEFAULT_MARKET;
  }

  const normalized = trimmed.toLowerCase();
  if (COIN_ALIAS_MAP[normalized]) {
    return COIN_ALIAS_MAP[normalized];
  }

  const upper = trimmed.toUpperCase();
  if (coinGeckoService.isSupported(upper)) {
    return upper;
  }

  const perpCandidate = upper.endsWith('-PERP') ? upper : `${upper}-PERP`;
  if (coinGeckoService.isSupported(perpCandidate)) {
    return perpCandidate;
  }

  throw new Error(
    `Unsupported market: ${input}. Supported symbols: ${coinGeckoService.getSupportedSymbols().join(', ')}`
  );
}

function normalizeMarket(input: string): string {
  return input.trim().toUpperCase();
}

function sanitizeForFile(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function computePriceSummary(data: PricePoint[]): PriceSummary {
  if (data.length === 0) {
    return { min: 0, max: 0, start: 0, end: 0 };
  }

  const sorted = [...data].sort((a: PricePoint, b: PricePoint) => a.timestamp.getTime() - b.timestamp.getTime());
  const prices = sorted.map((point: PricePoint) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    min,
    max,
    start: sorted[0].price,
    end: sorted[sorted.length - 1].price,
  };
}

function cloneHistoricalData(data: PricePoint[]): PricePoint[] {
  return data.map((point: PricePoint) => ({
    timestamp: new Date(point.timestamp.getTime()),
    price: point.price,
  }));
}

function printPriceChart(market: string, days: number, data: PricePoint[]): void {
  if (data.length === 0) {
    return;
  }

  const prices = data.map((point: PricePoint) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const maxWidth = 60;
  const step = Math.max(1, Math.floor(data.length / maxWidth));
  const blocks = ' ▁▂▃▄▅▆▇█';

  const sampled = data.filter((_: PricePoint, index: number) => index % step === 0);
  const series = sampled
    .map((point: PricePoint) => {
      const normalized = (point.price - min) / range;
      const level = Math.min(blocks.length - 1, Math.round(normalized * (blocks.length - 1)));
      return blocks[level];
    })
    .join('');

  const baseSymbol = market.replace('-PERP', '').toUpperCase();
  const label = `${baseSymbol} Price Chart (${days} day${days === 1 ? '' : 's'}, hourly)`;

  console.log(label);
  console.log(`Min: $${min.toFixed(2)}  Max: $${max.toFixed(2)}`);
  console.log(series);
  console.log();
}

async function saveReport(
  options: BacktestOptions,
  priceSummary: PriceSummary,
  results: BacktestResult[],
  bestStrategy: BacktestResult,
  dataPoints: number,
): Promise<void> {
  const report = {
    generatedAt: new Date().toISOString(),
    parameters: {
      market: options.market,
      days: options.days,
    },
    priceSummary,
    dataPoints,
    strategies: results.map(result => ({
      strategy: result.strategy,
      totalReturn: result.totalReturn,
      totalReturnPercent: result.totalReturnPercent,
      winRate: result.winRate,
      sharpeRatio: result.sharpeRatio,
      maxDrawdownPercent: result.maxDrawdownPercent,
      totalTrades: result.totalTrades,
    })),
    bestStrategy: {
      strategy: bestStrategy.strategy,
      totalReturn: bestStrategy.totalReturn,
      totalReturnPercent: bestStrategy.totalReturnPercent,
      winRate: bestStrategy.winRate,
      sharpeRatio: bestStrategy.sharpeRatio,
      maxDrawdownPercent: bestStrategy.maxDrawdownPercent,
      totalTrades: bestStrategy.totalTrades,
    },
  };

  const fileName = `backtest-report-${sanitizeForFile(options.market)}-${options.days}d.json`;
  const reportPath = path.resolve(process.cwd(), 'scripts', fileName);

  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`📄 Report saved to ${reportPath}`);
}

async function runAllBacktests() {
  const options = parseArgs();
  const { market, days } = options;

  console.log(`🔬 STRATEGY BACKTESTING - ${days} DAY${days === 1 ? '' : 'S'}\n`);
  console.log(`Testing all 4 strategies against ${days} day${days === 1 ? '' : 's'} of historical data\n`);
  console.log('═══════════════════════════════════════════════════════\n');

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const initialCapital = 1000;

  console.log(`Market: ${market}`);
  console.log(`Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  console.log(`Initial Capital: $${initialCapital}\n`);

  const results: BacktestResult[] = [];

  const originalGetHistoricalPrices = coinGeckoService.getHistoricalPrices.bind(coinGeckoService);
  const historicalDataRaw = await originalGetHistoricalPrices(market, days);

  if (!historicalDataRaw || historicalDataRaw.length === 0) {
    throw new Error(`No historical data returned for ${market}`);
  }

  const historicalData: PricePoint[] = historicalDataRaw.map((point: PricePoint) => ({
    timestamp: new Date(point.timestamp),
    price: point.price,
  }));

  const priceSummary = computePriceSummary(historicalData);

  console.log(
    `Using ${historicalData.length} price points from CoinGecko for ${market} over the last ${days} day${days === 1 ? '' : 's'}\n`
  );
  console.log(`Price range: $${priceSummary.min.toFixed(2)} -> $${priceSummary.max.toFixed(2)}`);
  console.log(`Start price: $${priceSummary.start.toFixed(2)}  End price: $${priceSummary.end.toFixed(2)}\n`);

  printPriceChart(market, days, historicalData);

  coinGeckoService.getHistoricalPrices = async (symbol: string, requestedDays: number = days) => {
    const normalizedSymbol = normalizeMarket(symbol);

    if (normalizedSymbol !== normalizeMarket(market)) {
      return originalGetHistoricalPrices(symbol, requestedDays);
    }

    const effectiveDays = requestedDays ?? days;

    if (effectiveDays >= days) {
      return cloneHistoricalData(historicalData);
    }

    const cutoff =
      historicalData[historicalData.length - 1].timestamp.getTime() - effectiveDays * 24 * 60 * 60 * 1000;

    return historicalData
      .filter((point: PricePoint) => point.timestamp.getTime() >= cutoff)
      .map((point: PricePoint) => ({
        timestamp: new Date(point.timestamp.getTime()),
        price: point.price,
      }));
  };

  try {
    // 1. DCA Strategy
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('1️⃣  DCA STRATEGY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const dcaConfig: BacktestConfig = {
      strategy: 'dca',
      market,
      startDate,
      endDate,
      initialCapital,
      leverage: 1,
      positionSize: 50,
      stopLoss: 5,
      takeProfit: 10,
      dcaAmount: 50,
      dcaInterval: 12, // Every 12 hours
    };

    const dcaResult = await backtestingService.runBacktest(dcaConfig);
    backtestingService.printResults(dcaResult);
    results.push(dcaResult);

    // 2. Grid Strategy
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('2️⃣  GRID STRATEGY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const gridConfig: BacktestConfig = {
      strategy: 'grid',
      market,
      startDate,
      endDate,
      initialCapital,
      leverage: 3,
      positionSize: 100,
      stopLoss: 3,
      takeProfit: 5,
      gridLevels: 10,
      gridSpacing: 1,
    };

    const gridResult = await backtestingService.runBacktest(gridConfig);
    backtestingService.printResults(gridResult);
    results.push(gridResult);

    // 3. Momentum Strategy
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('3️⃣  MOMENTUM STRATEGY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const momentumConfig: BacktestConfig = {
      strategy: 'momentum',
      market,
      startDate,
      endDate,
      initialCapital,
      leverage: 5,
      positionSize: 200,
      stopLoss: 2,
      takeProfit: 8,
      momentumPeriod: 20,
      momentumThreshold: 2,
    };

    const momentumResult = await backtestingService.runBacktest(momentumConfig);
    backtestingService.printResults(momentumResult);
    results.push(momentumResult);

    // 4. Mean Reversion Strategy
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('4️⃣  MEAN REVERSION STRATEGY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const reversionConfig: BacktestConfig = {
      strategy: 'meanReversion',
      market,
      startDate,
      endDate,
      initialCapital,
      leverage: 3,
      positionSize: 150,
      stopLoss: 3,
      takeProfit: 6,
      rsiPeriod: 14,
      rsiOversold: 30,
      rsiOverbought: 70,
    };

    const reversionResult = await backtestingService.runBacktest(reversionConfig);
    backtestingService.printResults(reversionResult);
    results.push(reversionResult);

    // Summary comparison
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 STRATEGY COMPARISON');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('┌─────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
    console.log('│ Strategy        │ Return % │ Win Rate │ Sharpe   │ Trades   │ Profit $ │');
    console.log('├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
    
    results.forEach((r: BacktestResult) => {
      const name = r.strategy.padEnd(15);
      const returnPct = r.totalReturnPercent.toFixed(2).padStart(7);
      const winRate = r.winRate.toFixed(1).padStart(7);
      const sharpe = r.sharpeRatio.toFixed(2).padStart(7);
      const trades = r.totalTrades.toString().padStart(7);
      const profit = r.totalReturn.toFixed(2).padStart(7);
      
      console.log(`│ ${name} │ ${returnPct}% │ ${winRate}% │ ${sharpe}  │ ${trades}  │ ${profit} │`);
    });
    
    console.log('└─────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘\n');

    // Best strategy
    const bestStrategy = results.reduce((best: BacktestResult, current: BacktestResult) =>
      current.totalReturnPercent > best.totalReturnPercent ? current : best
    );

    console.log(`🏆 BEST STRATEGY: ${bestStrategy.strategy.toUpperCase()}`);
    console.log(`   Return: ${bestStrategy.totalReturnPercent.toFixed(2)}%`);
    console.log(`   Win Rate: ${bestStrategy.winRate.toFixed(1)}%`);
    console.log(`   Sharpe Ratio: ${bestStrategy.sharpeRatio.toFixed(2)}`);
    console.log(`   Profit/Loss: $${bestStrategy.totalReturn.toFixed(2)}`);
    console.log(`   Max Drawdown: ${bestStrategy.maxDrawdownPercent.toFixed(2)}%\n`);

    // Recommendations
    console.log('═══════════════════════════════════════════════════════');
    console.log('💡 RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════\n');

    results.forEach(r => {
      console.log(`${r.strategy.toUpperCase()}:`);
      
      if (r.totalReturnPercent > 0) {
        console.log(`  ✅ Profitable strategy (+${r.totalReturnPercent.toFixed(2)}%)`);
      } else {
        console.log(`  ❌ Unprofitable strategy (${r.totalReturnPercent.toFixed(2)}%)`);
      }
      
      if (r.winRate > 50) {
        console.log(`  ✅ Good win rate (${r.winRate.toFixed(1)}%)`);
      } else {
        console.log(`  ⚠️  Low win rate (${r.winRate.toFixed(1)}%)`);
      }
      
      if (r.sharpeRatio > 1) {
        console.log(`  ✅ Good risk-adjusted returns (Sharpe: ${r.sharpeRatio.toFixed(2)})`);
      } else if (r.sharpeRatio > 0) {
        console.log(`  ⚠️  Moderate risk-adjusted returns (Sharpe: ${r.sharpeRatio.toFixed(2)})`);
      } else {
        console.log(`  ❌ Poor risk-adjusted returns (Sharpe: ${r.sharpeRatio.toFixed(2)})`);
      }
      
      if (r.maxDrawdownPercent < 10) {
        console.log(`  ✅ Low drawdown (${r.maxDrawdownPercent.toFixed(2)}%)`);
      } else if (r.maxDrawdownPercent < 20) {
        console.log(`  ⚠️  Moderate drawdown (${r.maxDrawdownPercent.toFixed(2)}%)`);
      } else {
        console.log(`  ❌ High drawdown (${r.maxDrawdownPercent.toFixed(2)}%)`);
      }
      
      console.log();
    });

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ BACKTESTING COMPLETE!\n');

    await saveReport(options, priceSummary, results, bestStrategy, historicalData.length);

  } catch (error: any) {
    console.error('\n❌ Backtesting failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    throw error;
  } finally {
    coinGeckoService.getHistoricalPrices = originalGetHistoricalPrices;
  }
}

runAllBacktests()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
