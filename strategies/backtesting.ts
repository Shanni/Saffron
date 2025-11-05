// Backtesting Service
// Test strategies against historical data

import { coinGeckoService } from '../services/coinGeckoService';

export interface BacktestConfig {
  strategy: 'dca' | 'grid' | 'momentum' | 'meanReversion';
  market: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  
  // Strategy parameters
  leverage: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  
  // DCA
  dcaAmount?: number;
  dcaInterval?: number; // hours
  
  // Grid
  gridLevels?: number;
  gridSpacing?: number;
  
  // Momentum
  momentumPeriod?: number;
  momentumThreshold?: number;
  
  // Mean Reversion
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
}

export interface Trade {
  timestamp: Date;
  type: 'entry' | 'exit';
  side: 'long' | 'short';
  price: number;
  size: number;
  pnl?: number;
  reason: string;
}

export interface BacktestResult {
  strategy: string;
  market: string;
  period: { start: Date; end: Date };
  
  // Performance metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // Financial metrics
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  
  // Risk metrics
  sharpeRatio: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  capitalUsage: {
    maxInvested: number;
    maxInvestedPercent: number;
    avgInvested: number;
    avgInvestedPercent: number;
  };
  
  // Trade details
  trades: Trade[];
  equity: Array<{ timestamp: Date; value: number }>;
}

class BacktestingService {
  /**
   * Run backtest for a strategy
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    console.log(`\n🔬 BACKTESTING ${config.strategy.toUpperCase()}`);
    console.log(`Market: ${config.market}`);
    console.log(`Period: ${config.startDate.toISOString().split('T')[0]} to ${config.endDate.toISOString().split('T')[0]}`);
    console.log(`Initial Capital: $${config.initialCapital}\n`);

    // Get historical data
    const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`Fetching ${days} days of historical data...`);
    
    const historicalData = await coinGeckoService.getHistoricalPrices(config.market, days);
    console.log(`✅ Fetched ${historicalData.length} price points\n`);

    // Run strategy simulation
    let result: BacktestResult;
    
    switch (config.strategy) {
      case 'dca':
        result = this.backtestDCA(config, historicalData);
        break;
      case 'grid':
        result = this.backtestGrid(config, historicalData);
        break;
      case 'momentum':
        result = this.backtestMomentum(config, historicalData);
        break;
      case 'meanReversion':
        result = this.backtestMeanReversion(config, historicalData);
        break;
      default:
        throw new Error(`Unknown strategy: ${config.strategy}`);
    }

    return result;
  }

  private backtestDCA(
    config: BacktestConfig,
    data: Array<{ timestamp: Date; price: number }>
  ): BacktestResult {
    const trades: Trade[] = [];
    const equity: Array<{ timestamp: Date; value: number }> = [];
    const cashHistory: number[] = [];
    
    let capital = config.initialCapital;
    let position = 0;
    let avgEntryPrice = 0;
    
    const dcaIntervalHours = config.dcaInterval || 24; // Default 24 hours
    const dcaAmount = config.dcaAmount || config.positionSize;
    
    let lastBuyTime = 0;
    
    data.forEach((point, index) => {
      const hoursSinceLastBuy = (point.timestamp.getTime() - lastBuyTime) / (1000 * 60 * 60);
      
      // DCA buy at intervals
      if (index === 0 || hoursSinceLastBuy >= dcaIntervalHours) {
        if (capital >= dcaAmount) {
          const size = dcaAmount / point.price;
          
          // Update average entry price
          avgEntryPrice = (avgEntryPrice * position + point.price * size) / (position + size);
          position += size;
          capital -= dcaAmount;
          lastBuyTime = point.timestamp.getTime();
          
          trades.push({
            timestamp: point.timestamp,
            type: 'entry',
            side: 'long',
            price: point.price,
            size,
            reason: 'DCA interval',
          });
        }
      }
      
      // Check stop loss / take profit
      if (position > 0) {
        const currentPnL = ((point.price - avgEntryPrice) / avgEntryPrice) * 100;
        
        if (currentPnL <= -config.stopLoss || currentPnL >= config.takeProfit) {
          const pnl = (point.price - avgEntryPrice) * position;
          capital += position * point.price;
          
          trades.push({
            timestamp: point.timestamp,
            type: 'exit',
            side: 'long',
            price: point.price,
            size: position,
            pnl,
            reason: currentPnL <= -config.stopLoss ? 'Stop loss' : 'Take profit',
          });
          
          position = 0;
          avgEntryPrice = 0;
        }
      }
      
      // Track equity
      const totalValue = capital + (position * point.price);
      equity.push({ timestamp: point.timestamp, value: totalValue });
      cashHistory.push(capital);
    });
    
    // Close any remaining position
    if (position > 0) {
      const lastPrice = data[data.length - 1].price;
      const pnl = (lastPrice - avgEntryPrice) * position;
      capital += position * lastPrice;
      cashHistory.push(capital);
      
      trades.push({
        timestamp: data[data.length - 1].timestamp,
        type: 'exit',
        side: 'long',
        price: lastPrice,
        size: position,
        pnl,
        reason: 'End of backtest',
      });
    }
    
    return this.calculateMetrics(config, trades, equity, capital, cashHistory);
  }

  /**
   * Backtest Grid strategy
   */
  private backtestGrid(
    config: BacktestConfig,
    data: Array<{ timestamp: Date; price: number }>
  ): BacktestResult {
    const trades: Trade[] = [];
    const equity: Array<{ timestamp: Date; value: number }> = [];
    const cashHistory: number[] = [];
    
    let capital = config.initialCapital;
    const positions: Array<{ price: number; size: number }> = [];
    
    // Calculate grid levels
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const gridLevels = config.gridLevels || 10;
    const gridSpacing = (maxPrice - minPrice) / gridLevels;
    
    const gridPrices = Array.from({ length: gridLevels + 1 }, (_, i) => 
      minPrice + (i * gridSpacing)
    );
    
    console.log(`Grid range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
    console.log(`Grid levels: ${gridLevels}, Spacing: $${gridSpacing.toFixed(2)}`);
    
    let prevPrice = data[0].price;
    
    data.forEach((point, index) => {
      if (index === 0) {
        equity.push({ timestamp: point.timestamp, value: capital });
        cashHistory.push(capital);
        return;
      }
      
      // Check if price crossed a grid level
      const crossedLevels = gridPrices.filter(gridPrice => 
        (prevPrice < gridPrice && point.price >= gridPrice) ||
        (prevPrice > gridPrice && point.price <= gridPrice)
      );
      
      crossedLevels.forEach(gridPrice => {
        const side = point.price > prevPrice ? 'short' : 'long'; // Counter-trend
        const size = config.positionSize / point.price;
        
        if (side === 'long' && capital >= config.positionSize) {
          // Buy
          positions.push({ price: point.price, size });
          capital -= config.positionSize;
          
          trades.push({
            timestamp: point.timestamp,
            type: 'entry',
            side: 'long',
            price: point.price,
            size,
            reason: `Grid level $${gridPrice.toFixed(2)}`,
          });
        } else if (side === 'short' && positions.length > 0) {
          // Sell oldest position
          const oldPosition = positions.shift()!;
          const pnl = (point.price - oldPosition.price) * oldPosition.size;
          capital += point.price * oldPosition.size;
          
          trades.push({
            timestamp: point.timestamp,
            type: 'exit',
            side: 'long',
            price: point.price,
            size: oldPosition.size,
            pnl,
            reason: `Grid level $${gridPrice.toFixed(2)}`,
          });
        }
      });
      
      prevPrice = point.price;
      
      // Track equity
      const positionValue = positions.reduce((sum, p) => sum + (p.size * point.price), 0);
      equity.push({ timestamp: point.timestamp, value: capital + positionValue });
      cashHistory.push(capital);
    });
    
    // Close all positions
    const lastPrice = data[data.length - 1].price;
    positions.forEach(pos => {
      const pnl = (lastPrice - pos.price) * pos.size;
      capital += lastPrice * pos.size;
      
      trades.push({
        timestamp: data[data.length - 1].timestamp,
        type: 'exit',
        side: 'long',
        price: lastPrice,
        size: pos.size,
        pnl,
        reason: 'End of backtest',
      });
    });
    cashHistory.push(capital);
    
    return this.calculateMetrics(config, trades, equity, capital, cashHistory);
  }

  /**
   * Backtest Momentum strategy
   */
  private backtestMomentum(
    config: BacktestConfig,
    data: Array<{ timestamp: Date; price: number }>
  ): BacktestResult {
    const trades: Trade[] = [];
    const equity: Array<{ timestamp: Date; value: number }> = [];
    const cashHistory: number[] = [];
    
    let capital = config.initialCapital;
    let position: { side: 'long' | 'short'; size: number; entryPrice: number } | null = null;
    
    const period = config.momentumPeriod || 20;
    const threshold = config.momentumThreshold || 2;
    
    data.forEach((point, index) => {
      if (index < period) {
        equity.push({ timestamp: point.timestamp, value: capital });
        cashHistory.push(capital);
        return;
      }
      
      // Calculate momentum
      const recentPrices = data.slice(index - period, index).map(d => d.price);
      const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / period;
      const momentum = ((point.price - avgPrice) / avgPrice) * 100;
      
      // Entry signals
      if (!position) {
        if (Math.abs(momentum) > threshold && capital >= config.positionSize) {
          const side: 'long' | 'short' = momentum > 0 ? 'long' : 'short';
          const size = config.positionSize / point.price;
          
          position = { side, size, entryPrice: point.price };
          capital -= config.positionSize;
          
          trades.push({
            timestamp: point.timestamp,
            type: 'entry',
            side,
            price: point.price,
            size,
            reason: `Momentum ${momentum.toFixed(2)}%`,
          });
        }
      } else {
        // Exit signals
        const pnlPercent = position.side === 'long'
          ? ((point.price - position.entryPrice) / position.entryPrice) * 100
          : ((position.entryPrice - point.price) / position.entryPrice) * 100;
        
        const shouldExit = 
          pnlPercent <= -config.stopLoss ||
          pnlPercent >= config.takeProfit ||
          (position.side === 'long' && momentum < -threshold) ||
          (position.side === 'short' && momentum > threshold);
        
        if (shouldExit) {
          const pnl = position.side === 'long'
            ? (point.price - position.entryPrice) * position.size
            : (position.entryPrice - point.price) * position.size;
          
          capital += point.price * position.size;
          
          trades.push({
            timestamp: point.timestamp,
            type: 'exit',
            side: position.side,
            price: point.price,
            size: position.size,
            pnl,
            reason: pnlPercent <= -config.stopLoss ? 'Stop loss' :
                    pnlPercent >= config.takeProfit ? 'Take profit' :
                    'Momentum reversal',
          });
          
          position = null;
        }
      }
      
      // Track equity
      const positionValue = position ? position.size * point.price : 0;
      equity.push({ timestamp: point.timestamp, value: capital + positionValue });
      cashHistory.push(capital);
    });
    
    // Close position if still open
    if (position) {
      const lastPrice = data[data.length - 1].price;
      const pnl = position.side === 'long'
        ? (lastPrice - position.entryPrice) * position.size
        : (position.entryPrice - lastPrice) * position.size;
      
      capital += lastPrice * position.size;
      
      trades.push({
        timestamp: data[data.length - 1].timestamp,
        type: 'exit',
        side: position.side,
        price: lastPrice,
        size: position.size,
        pnl,
        reason: 'End of backtest',
      });
      
      position = null;
      cashHistory.push(capital);
    }
    
    return this.calculateMetrics(config, trades, equity, capital, cashHistory);
  }

  /**
   * Backtest Mean Reversion strategy
   */
  private backtestMeanReversion(
    config: BacktestConfig,
    data: Array<{ timestamp: Date; price: number }>
  ): BacktestResult {
    const trades: Trade[] = [];
    const equity: Array<{ timestamp: Date; value: number }> = [];
    const cashHistory: number[] = [];
    
    let capital = config.initialCapital;
    let position: { side: 'long' | 'short'; size: number; entryPrice: number } | null = null;
    
    const period = config.rsiPeriod || 14;
    const oversold = config.rsiOversold || 30;
    const overbought = config.rsiOverbought || 70;
    
    data.forEach((point, index) => {
      if (index < period) {
        equity.push({ timestamp: point.timestamp, value: capital });
        cashHistory.push(capital);
        return;
      }
      
      // Calculate RSI
      const recentPrices = data.slice(index - period, index).map(d => d.price);
      const changes = recentPrices.slice(1).map((price, i) => price - recentPrices[i]);
      
      const gains = changes.filter(c => c > 0).reduce((sum, c) => sum + c, 0) / period;
      const losses = Math.abs(changes.filter(c => c < 0).reduce((sum, c) => sum + c, 0)) / period;
      const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
      
      // Entry signals
      if (!position) {
        if ((rsi < oversold || rsi > overbought) && capital >= config.positionSize) {
          const side: 'long' | 'short' = rsi < oversold ? 'long' : 'short';
          const size = config.positionSize / point.price;
          
          position = { side, size, entryPrice: point.price };
          capital -= config.positionSize;
          
          trades.push({
            timestamp: point.timestamp,
            type: 'entry',
            side,
            price: point.price,
            size,
            reason: `RSI ${rsi.toFixed(2)} (${side === 'long' ? 'oversold' : 'overbought'})`,
          });
        }
      } else {
        // Exit signals
        const pnlPercent = position.side === 'long'
          ? ((point.price - position.entryPrice) / position.entryPrice) * 100
          : ((position.entryPrice - point.price) / position.entryPrice) * 100;
        
        const shouldExit = 
          pnlPercent <= -config.stopLoss ||
          pnlPercent >= config.takeProfit ||
          (position.side === 'long' && rsi > 50) ||
          (position.side === 'short' && rsi < 50);
        
        if (shouldExit) {
          const pnl = position.side === 'long'
            ? (point.price - position.entryPrice) * position.size
            : (position.entryPrice - point.price) * position.size;
          
          capital += point.price * position.size;
          
          trades.push({
            timestamp: point.timestamp,
            type: 'exit',
            side: position.side,
            price: point.price,
            size: position.size,
            pnl,
            reason: pnlPercent <= -config.stopLoss ? 'Stop loss' :
                    pnlPercent >= config.takeProfit ? 'Take profit' :
                    'RSI normalized',
          });
          
          position = null;
        }
      }
      
      // Track equity
      const positionValue = position ? position.size * point.price : 0;
      equity.push({ timestamp: point.timestamp, value: capital + positionValue });
      cashHistory.push(capital);
    });
    
    // Close position if still open
    if (position) {
      const lastPrice = data[data.length - 1].price;
      const pnl = position.side === 'long'
        ? (lastPrice - position.entryPrice) * position.size
        : (position.entryPrice - lastPrice) * position.size;
      
      capital += lastPrice * position.size;
      
      trades.push({
        timestamp: data[data.length - 1].timestamp,
        type: 'exit',
        side: position.side,
        price: lastPrice,
        size: position.size,
        pnl,
        reason: 'End of backtest',
      });
      
      position = null;
      cashHistory.push(capital);
    }
    
    return this.calculateMetrics(config, trades, equity, capital, cashHistory);
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(
    config: BacktestConfig,
    trades: Trade[],
    equity: Array<{ timestamp: Date; value: number }>,
    finalCapital: number,
    cashHistory: number[]
  ): BacktestResult {
    const exitTrades = trades.filter(t => t.type === 'exit' && t.pnl !== undefined);
    const winningTrades = exitTrades.filter(t => t.pnl! > 0);
    const losingTrades = exitTrades.filter(t => t.pnl! < 0);
    
    const totalReturn = finalCapital - config.initialCapital;
    const totalReturnPercent = (totalReturn / config.initialCapital) * 100;
    
    // Max drawdown
    let maxDrawdown = 0;
    let peak = config.initialCapital;
    equity.forEach(e => {
      if (e.value > peak) peak = e.value;
      const drawdown = peak - e.value;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    const maxDrawdownPercent = (maxDrawdown / peak) * 100;
    
    // Sharpe ratio (simplified)
    const returns = equity.slice(1).map((e, i) => 
      (e.value - equity[i].value) / equity[i].value
    );
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(365); // Annualized
    
    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl!, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl!, 0));
    const profitFactor = grossLoss === 0 ? Infinity : grossProfit / grossLoss;
    
    const minCash = cashHistory.length ? Math.min(...cashHistory) : config.initialCapital;
    const avgCash = cashHistory.length
      ? cashHistory.reduce((sum, value) => sum + value, 0) / cashHistory.length
      : config.initialCapital;
    const maxInvested = config.initialCapital - minCash;
    const avgInvested = config.initialCapital - avgCash;
    const maxInvestedPercent = config.initialCapital === 0 ? 0 : (maxInvested / config.initialCapital) * 100;
    const avgInvestedPercent = config.initialCapital === 0 ? 0 : (avgInvested / config.initialCapital) * 100;

    return {
      strategy: config.strategy,
      market: config.market,
      period: { start: config.startDate, end: config.endDate },
      
      totalTrades: exitTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: exitTrades.length === 0 ? 0 : (winningTrades.length / exitTrades.length) * 100,
      
      initialCapital: config.initialCapital,
      finalCapital,
      totalReturn,
      totalReturnPercent,
      maxDrawdown,
      maxDrawdownPercent,
      
      sharpeRatio,
      profitFactor,
      avgWin: winningTrades.length === 0 ? 0 : grossProfit / winningTrades.length,
      avgLoss: losingTrades.length === 0 ? 0 : grossLoss / losingTrades.length,
      largestWin: winningTrades.length === 0 ? 0 : Math.max(...winningTrades.map(t => t.pnl!)),
      largestLoss: losingTrades.length === 0 ? 0 : Math.min(...losingTrades.map(t => t.pnl!)),
      capitalUsage: {
        maxInvested,
        maxInvestedPercent,
        avgInvested,
        avgInvestedPercent,
      },
      
      trades,
      equity,
    };
  }

  /**
   * Print backtest results
   */
  printResults(result: BacktestResult): void {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`📊 BACKTEST RESULTS: ${result.strategy.toUpperCase()}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📈 PERFORMANCE');
    console.log(`Initial Capital: $${result.initialCapital.toFixed(2)}`);
    console.log(`Final Capital: $${result.finalCapital.toFixed(2)}`);
    console.log(`Total Return: $${result.totalReturn.toFixed(2)} (${result.totalReturnPercent.toFixed(2)}%)`);
    console.log(`Max Drawdown: $${result.maxDrawdown.toFixed(2)} (${result.maxDrawdownPercent.toFixed(2)}%)\n`);
    
    console.log('📊 TRADE STATISTICS');
    console.log(`Total Trades: ${result.totalTrades}`);
    console.log(`Winning Trades: ${result.winningTrades} (${result.winRate.toFixed(2)}%)`);
    console.log(`Losing Trades: ${result.losingTrades}\n`);
    
    console.log('💰 PROFIT/LOSS');
    console.log(`Average Win: $${result.avgWin.toFixed(2)}`);
    console.log(`Average Loss: $${result.avgLoss.toFixed(2)}`);
    console.log(`Largest Win: $${result.largestWin.toFixed(2)}`);
    console.log(`Largest Loss: $${result.largestLoss.toFixed(2)}\n`);
    
    console.log('💼 CAPITAL USAGE');
    console.log(`Max Invested: $${result.capitalUsage.maxInvested.toFixed(2)} (${result.capitalUsage.maxInvestedPercent.toFixed(2)}%)`);
    console.log(`Avg Invested: $${result.capitalUsage.avgInvested.toFixed(2)} (${result.capitalUsage.avgInvestedPercent.toFixed(2)}%)\n`);

    console.log('📉 RISK METRICS');
    console.log(`Sharpe Ratio: ${result.sharpeRatio.toFixed(2)}`);
    console.log(`Profit Factor: ${result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(2)}\n`);
    
    if (result.trades.length > 0) {
      console.log('🕒 TRADE TIMELINE');
      result.trades.forEach(trade => {
        const direction = `${trade.type.toUpperCase()} ${trade.side.toUpperCase()}`;
        const price = `$${trade.price.toFixed(2)}`;
        const size = trade.size.toFixed(4);
        const pnl = trade.pnl !== undefined ? ` PnL: ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '';
        console.log(`- ${trade.timestamp.toISOString()} | ${direction} | Size: ${size} | Price: ${price}${pnl} | Reason: ${trade.reason}`);
      });
      console.log();
    }

    console.log('═══════════════════════════════════════════════════════\n');
  }
}

// Export singleton
export const backtestingService = new BacktestingService();
