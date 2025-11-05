// Strategy Engine for Saffron
// Implements various automated trading strategies

import { dexService, OrderParams, Position, TradeResult } from './dexIntegration';

export interface StrategyConfig {
  id: string;
  name: string;
  type: 'grid' | 'dca' | 'momentum' | 'mean_reversion' | 'arbitrage';
  market: string;
  status: 'active' | 'paused' | 'stopped';
  
  // Risk parameters
  maxLeverage: number;
  stopLoss: number; // percentage
  takeProfit: number; // percentage
  riskPerTrade: number; // percentage of portfolio
  
  // Strategy-specific parameters
  gridLevels?: number;
  gridSpacing?: number; // percentage
  dcaInterval?: number; // seconds
  dcaAmount?: number;
  momentumPeriod?: number;
  momentumThreshold?: number;
  reversionPeriod?: number;
  reversionBands?: number;
  
  // Execution settings
  maxPositions: number;
  rebalanceThreshold: number;
  
  createdAt: Date;
  lastExecution: Date;
}

export interface StrategyPerformance {
  strategyId: string;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgTradeReturn: number;
  profitFactor: number;
  trades: TradeRecord[];
}

export interface TradeRecord {
  id: string;
  strategyId: string;
  market: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  pnl?: number;
  entryTime: Date;
  exitTime?: Date;
  reason: 'strategy' | 'stop_loss' | 'take_profit' | 'manual';
}

export interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
  
  // Technical indicators
  sma20?: number;
  sma50?: number;
  rsi?: number;
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
  };
}

class StrategyEngine {
  private strategies: Map<string, StrategyConfig> = new Map();
  private performances: Map<string, StrategyPerformance> = new Map();
  private marketData: Map<string, MarketData[]> = new Map();
  private activeIntervals: Map<string, any> = new Map();

  constructor() {
    this.initializeMarketData();
    this.startMarketDataUpdates();
  }

  // Initialize mock market data
  private initializeMarketData() {
    const markets = ['SOL-PERP', 'BTC-PERP', 'ETH-PERP', 'BONK-PERP'];
    
    markets.forEach(market => {
      const data: MarketData[] = [];
      const basePrice = dexService.getCurrentPrice(market);
      
      // Generate 100 historical data points
      for (let i = 99; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 60000); // 1 minute intervals
        const price = basePrice * (1 + (Math.random() - 0.5) * 0.02); // ±1% variation
        
        data.push({
          symbol: market,
          price,
          volume24h: Math.random() * 10000000,
          change24h: (Math.random() - 0.5) * 10,
          high24h: price * 1.02,
          low24h: price * 0.98,
          timestamp,
        });
      }
      
      this.marketData.set(market, data);
    });
  }

  // Start real-time market data updates
  private startMarketDataUpdates() {
    setInterval(() => {
      this.marketData.forEach((data, market) => {
        const lastPrice = data[data.length - 1]?.price || dexService.getCurrentPrice(market);
        const newPrice = lastPrice * (1 + (Math.random() - 0.5) * 0.001); // ±0.05% variation
        
        const newData: MarketData = {
          symbol: market,
          price: newPrice,
          volume24h: Math.random() * 10000000,
          change24h: ((newPrice - data[0]?.price) / data[0]?.price) * 100,
          high24h: Math.max(...data.slice(-1440).map(d => d.price)), // Last 24h
          low24h: Math.min(...data.slice(-1440).map(d => d.price)),
          timestamp: new Date(),
        };
        
        // Add technical indicators
        this.addTechnicalIndicators(newData, data);
        
        data.push(newData);
        
        // Keep only last 1440 data points (24 hours)
        if (data.length > 1440) {
          data.shift();
        }
      });
    }, 5000); // Update every 5 seconds
  }

  // Add technical indicators to market data
  private addTechnicalIndicators(newData: MarketData, historicalData: MarketData[]) {
    const prices = historicalData.map(d => d.price);
    
    // Simple Moving Averages
    if (prices.length >= 20) {
      newData.sma20 = prices.slice(-20).reduce((a, b) => a + b) / 20;
    }
    if (prices.length >= 50) {
      newData.sma50 = prices.slice(-50).reduce((a, b) => a + b) / 50;
    }
    
    // RSI (simplified)
    if (prices.length >= 14) {
      const changes = prices.slice(-14).map((price, i) => 
        i === 0 ? 0 : price - prices[prices.length - 14 + i - 1]
      );
      const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / 14;
      const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0)) / 14;
      newData.rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
    }
    
    // Bollinger Bands
    if (prices.length >= 20) {
      const sma = newData.sma20!;
      const variance = prices.slice(-20).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      
      newData.bollinger = {
        upper: sma + (2 * stdDev),
        middle: sma,
        lower: sma - (2 * stdDev),
      };
    }
  }

  // Create a new strategy
  createStrategy(config: Omit<StrategyConfig, 'id' | 'createdAt' | 'lastExecution'>): string {
    const strategyId = Date.now().toString();
    const strategy: StrategyConfig = {
      ...config,
      id: strategyId,
      createdAt: new Date(),
      lastExecution: new Date(),
    };
    
    this.strategies.set(strategyId, strategy);
    this.performances.set(strategyId, {
      strategyId,
      totalPnL: 0,
      winRate: 0,
      totalTrades: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      avgTradeReturn: 0,
      profitFactor: 0,
      trades: [],
    });
    
    if (strategy.status === 'active') {
      this.startStrategy(strategyId);
    }
    
    return strategyId;
  }

  // Start executing a strategy
  startStrategy(strategyId: string) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;
    
    strategy.status = 'active';
    
    // Set up execution interval based on strategy type
    let intervalMs = 60000; // Default 1 minute
    
    switch (strategy.type) {
      case 'grid':
        intervalMs = 30000; // 30 seconds for grid
        break;
      case 'dca':
        intervalMs = strategy.dcaInterval ? strategy.dcaInterval * 1000 : 300000; // 5 minutes default
        break;
      case 'momentum':
      case 'mean_reversion':
        intervalMs = 60000; // 1 minute
        break;
      case 'arbitrage':
        intervalMs = 10000; // 10 seconds for arbitrage
        break;
    }
    
    const interval = setInterval(() => {
      this.executeStrategy(strategyId);
    }, intervalMs);
    
    this.activeIntervals.set(strategyId, interval);
  }

  // Stop a strategy
  stopStrategy(strategyId: string) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;
    
    strategy.status = 'stopped';
    
    const interval = this.activeIntervals.get(strategyId);
    if (interval) {
      clearInterval(interval);
      this.activeIntervals.delete(strategyId);
    }
  }

  // Execute strategy logic
  private async executeStrategy(strategyId: string) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy || strategy.status !== 'active') return;
    
    try {
      const marketData = this.getLatestMarketData(strategy.market);
      if (!marketData) return;
      
      let shouldTrade = false;
      let orderParams: OrderParams | null = null;
      
      switch (strategy.type) {
        case 'grid':
          ({ shouldTrade, orderParams } = this.executeGridStrategy(strategy, marketData));
          break;
        case 'dca':
          ({ shouldTrade, orderParams } = this.executeDCAStrategy(strategy, marketData));
          break;
        case 'momentum':
          ({ shouldTrade, orderParams } = this.executeMomentumStrategy(strategy, marketData));
          break;
        case 'mean_reversion':
          ({ shouldTrade, orderParams } = this.executeMeanReversionStrategy(strategy, marketData));
          break;
        case 'arbitrage':
          ({ shouldTrade, orderParams } = this.executeArbitrageStrategy(strategy, marketData));
          break;
      }
      
      if (shouldTrade && orderParams) {
        const result = await dexService.executeTrade(orderParams);
        if (result.success && result.position) {
          this.recordTrade(strategyId, result.position, 'strategy');
        }
      }
      
      strategy.lastExecution = new Date();
      
    } catch (error) {
      console.error(`Error executing strategy ${strategyId}:`, error);
    }
  }

  // Grid Trading Strategy
  private executeGridStrategy(strategy: StrategyConfig, marketData: MarketData): {
    shouldTrade: boolean;
    orderParams: OrderParams | null;
  } {
    const currentPrice = marketData.price;
    const gridLevels = strategy.gridLevels || 10;
    const gridSpacing = (strategy.gridSpacing || 1) / 100; // Convert to decimal
    
    // Calculate grid levels
    const basePrice = marketData.sma20 || currentPrice;
    const gridSize = strategy.riskPerTrade / 100 * 1000; // Simplified position sizing
    
    // Check if price has moved enough to trigger a grid order
    const priceChange = Math.abs(currentPrice - basePrice) / basePrice;
    
    if (priceChange > gridSpacing) {
      const side = currentPrice > basePrice ? 'short' : 'long'; // Counter-trend
      
      return {
        shouldTrade: true,
        orderParams: {
          market: strategy.market,
          side,
          size: gridSize,
          leverage: Math.min(strategy.maxLeverage, 3),
          orderType: 'limit',
          price: currentPrice,
          stopLoss: strategy.stopLoss,
          takeProfit: strategy.takeProfit,
        },
      };
    }
    
    return { shouldTrade: false, orderParams: null };
  }

  // DCA Strategy
  private executeDCAStrategy(strategy: StrategyConfig, marketData: MarketData): {
    shouldTrade: boolean;
    orderParams: OrderParams | null;
  } {
    const performance = this.performances.get(strategy.id);
    if (!performance) return { shouldTrade: false, orderParams: null };
    
    // Check if it's time for next DCA purchase
    const lastTrade = performance.trades[performance.trades.length - 1];
    const timeSinceLastTrade = lastTrade 
      ? Date.now() - lastTrade.entryTime.getTime()
      : Infinity;
    
    const dcaInterval = (strategy.dcaInterval || 300) * 1000; // Convert to ms
    
    if (timeSinceLastTrade >= dcaInterval) {
      const dcaAmount = strategy.dcaAmount || (strategy.riskPerTrade / 100 * 1000);
      
      return {
        shouldTrade: true,
        orderParams: {
          market: strategy.market,
          side: 'long', // DCA is typically long-only
          size: dcaAmount,
          leverage: 1, // DCA usually uses no leverage
          orderType: 'market',
          stopLoss: strategy.stopLoss,
          takeProfit: strategy.takeProfit,
        },
      };
    }
    
    return { shouldTrade: false, orderParams: null };
  }

  // Momentum Strategy
  private executeMomentumStrategy(strategy: StrategyConfig, marketData: MarketData): {
    shouldTrade: boolean;
    orderParams: OrderParams | null;
  } {
    if (!marketData.sma20 || !marketData.sma50) {
      return { shouldTrade: false, orderParams: null };
    }
    
    const currentPrice = marketData.price;
    const shortMA = marketData.sma20;
    const longMA = marketData.sma50;
    const momentumThreshold = (strategy.momentumThreshold || 2) / 100;
    
    // Check for momentum signal
    const momentum = (shortMA - longMA) / longMA;
    const priceAboveMA = (currentPrice - shortMA) / shortMA;
    
    if (Math.abs(momentum) > momentumThreshold && Math.abs(priceAboveMA) < 0.02) {
      const side = momentum > 0 ? 'long' : 'short';
      const positionSize = strategy.riskPerTrade / 100 * 1000;
      
      return {
        shouldTrade: true,
        orderParams: {
          market: strategy.market,
          side,
          size: positionSize,
          leverage: Math.min(strategy.maxLeverage, 5),
          orderType: 'market',
          stopLoss: strategy.stopLoss,
          takeProfit: strategy.takeProfit,
        },
      };
    }
    
    return { shouldTrade: false, orderParams: null };
  }

  // Mean Reversion Strategy
  private executeMeanReversionStrategy(strategy: StrategyConfig, marketData: MarketData): {
    shouldTrade: boolean;
    orderParams: OrderParams | null;
  } {
    if (!marketData.bollinger || !marketData.rsi) {
      return { shouldTrade: false, orderParams: null };
    }
    
    const currentPrice = marketData.price;
    const { upper, lower } = marketData.bollinger;
    const rsi = marketData.rsi;
    
    // Mean reversion signals
    const oversold = currentPrice <= lower && rsi < 30;
    const overbought = currentPrice >= upper && rsi > 70;
    
    if (oversold || overbought) {
      const side = oversold ? 'long' : 'short';
      const positionSize = strategy.riskPerTrade / 100 * 1000;
      
      return {
        shouldTrade: true,
        orderParams: {
          market: strategy.market,
          side,
          size: positionSize,
          leverage: Math.min(strategy.maxLeverage, 3),
          orderType: 'market',
          stopLoss: strategy.stopLoss,
          takeProfit: strategy.takeProfit,
        },
      };
    }
    
    return { shouldTrade: false, orderParams: null };
  }

  // Arbitrage Strategy
  private executeArbitrageStrategy(strategy: StrategyConfig, marketData: MarketData): {
    shouldTrade: boolean;
    orderParams: OrderParams | null;
  } {
    // Simplified arbitrage - in reality, this would compare prices across DEXs
    const markets = dexService.getMarkets();
    const sameMarkets = markets.filter(m => m.symbol === strategy.market);
    
    if (sameMarkets.length < 2) {
      return { shouldTrade: false, orderParams: null };
    }
    
    // Find price differences
    const prices = sameMarkets.map(m => ({
      dex: m.dex.name,
      price: dexService.getCurrentPrice(m.symbol),
      liquidity: m.liquidity,
    }));
    
    prices.sort((a, b) => a.price - b.price);
    const priceDiff = (prices[prices.length - 1].price - prices[0].price) / prices[0].price;
    
    // If price difference > 0.5%, execute arbitrage
    if (priceDiff > 0.005) {
      const positionSize = Math.min(
        strategy.riskPerTrade / 100 * 1000,
        prices[0].liquidity * 0.01 // Max 1% of liquidity
      );
      
      return {
        shouldTrade: true,
        orderParams: {
          market: strategy.market,
          side: 'long', // Buy low, sell high
          size: positionSize,
          leverage: 1,
          orderType: 'market',
        },
      };
    }
    
    return { shouldTrade: false, orderParams: null };
  }

  // Record trade for performance tracking
  private recordTrade(strategyId: string, position: Position, reason: TradeRecord['reason']) {
    const performance = this.performances.get(strategyId);
    if (!performance) return;
    
    const trade: TradeRecord = {
      id: position.id,
      strategyId,
      market: position.market,
      side: position.side,
      entryPrice: position.entryPrice,
      size: position.size,
      entryTime: position.timestamp,
      reason,
    };
    
    performance.trades.push(trade);
    performance.totalTrades++;
    
    // Update performance metrics
    this.updatePerformanceMetrics(strategyId);
  }

  // Update performance metrics
  private updatePerformanceMetrics(strategyId: string) {
    const performance = this.performances.get(strategyId);
    if (!performance) return;
    
    const trades = performance.trades;
    const completedTrades = trades.filter(t => t.exitPrice && t.pnl !== undefined);
    
    if (completedTrades.length === 0) return;
    
    // Calculate metrics
    const totalPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = completedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = completedTrades.filter(t => (t.pnl || 0) < 0);
    
    performance.totalPnL = totalPnL;
    performance.winRate = (winningTrades.length / completedTrades.length) * 100;
    performance.avgTradeReturn = totalPnL / completedTrades.length;
    
    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    performance.profitFactor = grossLoss === 0 ? Infinity : grossProfit / grossLoss;
    
    // Simplified Sharpe ratio calculation
    const returns = completedTrades.map(t => (t.pnl || 0) / (t.size * t.entryPrice));
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    performance.sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualized
  }

  // Get latest market data
  private getLatestMarketData(market: string): MarketData | null {
    const data = this.marketData.get(market);
    return data ? data[data.length - 1] : null;
  }

  // Public methods
  getStrategy(strategyId: string): StrategyConfig | undefined {
    return this.strategies.get(strategyId);
  }

  getAllStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values());
  }

  getPerformance(strategyId: string): StrategyPerformance | undefined {
    return this.performances.get(strategyId);
  }

  getMarketData(market: string, limit?: number): MarketData[] {
    const data = this.marketData.get(market) || [];
    return limit ? data.slice(-limit) : data;
  }

  updateStrategy(strategyId: string, updates: Partial<StrategyConfig>) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;
    
    Object.assign(strategy, updates);
    
    // Restart if status changed to active
    if (updates.status === 'active' && !this.activeIntervals.has(strategyId)) {
      this.startStrategy(strategyId);
    } else if (updates.status !== 'active' && this.activeIntervals.has(strategyId)) {
      this.stopStrategy(strategyId);
    }
  }

  deleteStrategy(strategyId: string) {
    this.stopStrategy(strategyId);
    this.strategies.delete(strategyId);
    this.performances.delete(strategyId);
  }
}

// Export singleton instance
export const strategyEngine = new StrategyEngine();
