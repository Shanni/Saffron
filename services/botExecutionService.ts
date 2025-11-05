// Bot Execution Service - Frontend
// Manages strategy execution in the frontend/mobile app

import { coinGeckoService, SimplePriceData } from './coinGeckoService';
import { driftService, DRIFT_MARKETS } from './driftService';

export interface Strategy {
  id: string;
  name: string;
  type: 'dca' | 'grid' | 'momentum' | 'meanReversion';
  market: string;
  enabled: boolean;
  
  // Execution settings
  leverage: number;
  positionSize: number; // USD
  stopLoss: number; // percentage
  takeProfit: number; // percentage
  
  // Trigger settings
  triggerType: 'manual' | 'price' | 'time' | 'indicator';
  triggerPrice?: number;
  triggerCondition?: 'above' | 'below';
  triggerInterval?: number; // seconds
  
  // Strategy-specific
  dcaAmount?: number;
  dcaInterval?: number;
  gridLevels?: number;
  gridSpacing?: number;
  gridMin?: number;
  gridMax?: number;
  momentumPeriod?: number;
  momentumThreshold?: number;
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
  
  // Stats
  createdAt: Date;
  lastExecuted?: Date;
  totalExecutions: number;
  totalPnL: number;
  status: 'idle' | 'running' | 'error';
  lastError?: string;
}

export interface ExecutionResult {
  success: boolean;
  strategyId: string;
  txSignature?: string;
  error?: string;
  timestamp: Date;
  price: number;
  amount: number;
  direction: 'long' | 'short';
}

export interface BotState {
  isRunning: boolean;
  strategies: Strategy[];
  priceData: Map<string, SimplePriceData>;
  lastUpdate: Date;
  executionHistory: ExecutionResult[];
}

class BotExecutionService {
  private strategies: Map<string, Strategy> = new Map();
  private priceData: Map<string, SimplePriceData> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private priceHistory: Map<string, number[]> = new Map();
  
  private isRunning = false;
  private updateInterval: any = null;
  private readonly UPDATE_INTERVAL_MS = 10000; // 10 seconds

  /**
   * Start bot execution
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Bot already running');
      return;
    }

    console.log('🚀 Starting bot execution...');
    this.isRunning = true;

    // Initial update
    this.updatePrices();

    // Set up interval
    this.updateInterval = setInterval(() => {
      this.updatePrices();
      this.checkStrategies();
    }, this.UPDATE_INTERVAL_MS);

    console.log('✅ Bot started');
  }

  /**
   * Stop bot execution
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  Bot not running');
      return;
    }

    console.log('🛑 Stopping bot...');
    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('✅ Bot stopped');
  }

  /**
   * Update prices from CoinGecko
   */
  private async updatePrices(): Promise<void> {
    try {
      // Get unique markets from strategies
      const markets = [...new Set(Array.from(this.strategies.values()).map(s => s.market))];
      
      if (markets.length === 0) {
        return;
      }

      console.log(`📊 Updating prices for ${markets.length} markets...`);
      
      const prices = await coinGeckoService.getMultiplePrices(markets);
      
      prices.forEach((priceData, symbol) => {
        this.priceData.set(symbol, priceData);
        
        // Store in price history
        if (!this.priceHistory.has(symbol)) {
          this.priceHistory.set(symbol, []);
        }
        const history = this.priceHistory.get(symbol)!;
        history.push(priceData.price);
        
        // Keep last 100 prices
        if (history.length > 100) {
          history.shift();
        }
        
        console.log(`   ${symbol}: $${priceData.price.toFixed(2)} (${priceData.change24h > 0 ? '+' : ''}${priceData.change24h.toFixed(2)}%)`);
      });
    } catch (error: any) {
      console.error('❌ Failed to update prices:', error.message);
    }
  }

  /**
   * Check all strategies and execute if conditions met
   */
  private async checkStrategies(): Promise<void> {
    const activeStrategies = Array.from(this.strategies.values()).filter(s => s.enabled);
    
    for (const strategy of activeStrategies) {
      try {
        const shouldExecute = await this.shouldExecuteStrategy(strategy);
        
        if (shouldExecute) {
          await this.executeStrategy(strategy);
        }
      } catch (error: any) {
        console.error(`❌ Error checking strategy ${strategy.name}:`, error.message);
        strategy.status = 'error';
        strategy.lastError = error.message;
      }
    }
  }

  /**
   * Check if strategy should execute
   */
  private async shouldExecuteStrategy(strategy: Strategy): Promise<boolean> {
    // Check cooldown
    if (strategy.lastExecuted) {
      const timeSinceExecution = Date.now() - strategy.lastExecuted.getTime();
      const minInterval = this.getMinInterval(strategy);
      
      if (timeSinceExecution < minInterval) {
        return false;
      }
    }

    // Get current price
    const priceData = this.priceData.get(strategy.market);
    if (!priceData) {
      return false;
    }

    // Check trigger conditions
    switch (strategy.triggerType) {
      case 'manual':
        return false; // Manual execution only
      
      case 'price':
        return this.checkPriceTrigger(strategy, priceData.price);
      
      case 'time':
        return this.checkTimeTrigger(strategy);
      
      case 'indicator':
        return this.checkIndicatorTrigger(strategy, priceData.price);
      
      default:
        return false;
    }
  }

  /**
   * Check price trigger
   */
  private checkPriceTrigger(strategy: Strategy, currentPrice: number): boolean {
    if (!strategy.triggerPrice || !strategy.triggerCondition) {
      return false;
    }

    switch (strategy.triggerCondition) {
      case 'above':
        return currentPrice > strategy.triggerPrice;
      case 'below':
        return currentPrice < strategy.triggerPrice;
      default:
        return false;
    }
  }

  /**
   * Check time trigger
   */
  private checkTimeTrigger(strategy: Strategy): boolean {
    if (!strategy.triggerInterval) {
      return false;
    }

    if (!strategy.lastExecuted) {
      return true;
    }

    const timeSinceExecution = Date.now() - strategy.lastExecuted.getTime();
    return timeSinceExecution >= strategy.triggerInterval * 1000;
  }

  /**
   * Check indicator trigger
   */
  private checkIndicatorTrigger(strategy: Strategy, currentPrice: number): boolean {
    const history = this.priceHistory.get(strategy.market);
    if (!history || history.length < 14) {
      return false;
    }

    switch (strategy.type) {
      case 'momentum':
        return this.checkMomentum(strategy, currentPrice, history);
      
      case 'meanReversion':
        return this.checkMeanReversion(strategy, currentPrice, history);
      
      default:
        return false;
    }
  }

  /**
   * Check momentum indicator
   */
  private checkMomentum(strategy: Strategy, currentPrice: number, history: number[]): boolean {
    const period = strategy.momentumPeriod || 20;
    if (history.length < period) {
      return false;
    }

    const recentPrices = history.slice(-period);
    const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / period;
    const momentum = ((currentPrice - avgPrice) / avgPrice) * 100;

    return Math.abs(momentum) > (strategy.momentumThreshold || 2);
  }

  /**
   * Check mean reversion indicator
   */
  private checkMeanReversion(strategy: Strategy, currentPrice: number, history: number[]): boolean {
    const period = strategy.rsiPeriod || 14;
    if (history.length < period) {
      return false;
    }

    // Calculate RSI
    const recentPrices = history.slice(-period);
    const changes = recentPrices.slice(1).map((price, i) => price - recentPrices[i]);
    
    const gains = changes.filter(c => c > 0).reduce((sum, c) => sum + c, 0) / period;
    const losses = Math.abs(changes.filter(c => c < 0).reduce((sum, c) => sum + c, 0)) / period;
    const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));

    const oversold = rsi < (strategy.rsiOversold || 30);
    const overbought = rsi > (strategy.rsiOverbought || 70);

    return oversold || overbought;
  }

  /**
   * Execute a strategy
   */
  async executeStrategy(strategy: Strategy): Promise<ExecutionResult> {
    console.log(`\n🎯 Executing ${strategy.type}: ${strategy.name}`);
    
    const priceData = this.priceData.get(strategy.market);
    if (!priceData) {
      throw new Error('Price data not available');
    }

    const currentPrice = priceData.price;
    console.log(`   Market: ${strategy.market}`);
    console.log(`   Price: $${currentPrice.toFixed(2)}`);

    try {
      let result: ExecutionResult;

      switch (strategy.type) {
        case 'dca':
          result = await this.executeDCA(strategy, currentPrice);
          break;
        
        case 'grid':
          result = await this.executeGrid(strategy, currentPrice);
          break;
        
        case 'momentum':
          result = await this.executeMomentum(strategy, currentPrice);
          break;
        
        case 'meanReversion':
          result = await this.executeMeanReversion(strategy, currentPrice);
          break;
        
        default:
          throw new Error(`Unknown strategy type: ${strategy.type}`);
      }

      // Update strategy stats
      strategy.lastExecuted = new Date();
      strategy.totalExecutions++;
      strategy.status = 'idle';
      strategy.lastError = undefined;

      // Store execution history
      this.executionHistory.push(result);
      if (this.executionHistory.length > 100) {
        this.executionHistory.shift();
      }

      console.log(`✅ Execution successful`);
      if (result.txSignature) {
        console.log(`   TX: ${result.txSignature}`);
      }

      return result;
    } catch (error: any) {
      console.error(`❌ Execution failed:`, error.message);
      
      const result: ExecutionResult = {
        success: false,
        strategyId: strategy.id,
        error: error.message,
        timestamp: new Date(),
        price: currentPrice,
        amount: 0,
        direction: 'long',
      };

      strategy.status = 'error';
      strategy.lastError = error.message;
      this.executionHistory.push(result);

      return result;
    }
  }

  /**
   * Execute DCA strategy
   */
  private async executeDCA(strategy: Strategy, currentPrice: number): Promise<ExecutionResult> {
    const amount = strategy.dcaAmount || strategy.positionSize;
    const marketIndex = DRIFT_MARKETS[strategy.market as keyof typeof DRIFT_MARKETS];
    
    console.log(`   DCA buy: $${amount}`);
    
    const baseAssetAmount = (amount / currentPrice) * 1e9;
    
    const tx = await driftService.openPosition({
      marketIndex,
      direction: 'long',
      baseAssetAmount: Math.floor(baseAssetAmount),
      leverage: strategy.leverage,
    });

    return {
      success: true,
      strategyId: strategy.id,
      txSignature: tx,
      timestamp: new Date(),
      price: currentPrice,
      amount,
      direction: 'long',
    };
  }

  /**
   * Execute Grid strategy
   */
  private async executeGrid(strategy: Strategy, currentPrice: number): Promise<ExecutionResult> {
    const marketIndex = DRIFT_MARKETS[strategy.market as keyof typeof DRIFT_MARKETS];
    
    const gridMin = strategy.gridMin || currentPrice * 0.95;
    const gridMax = strategy.gridMax || currentPrice * 1.05;
    const gridLevels = strategy.gridLevels || 10;
    const gridSpacing = (gridMax - gridMin) / gridLevels;
    
    const nearestLevel = Math.round((currentPrice - gridMin) / gridSpacing);
    const targetPrice = gridMin + (nearestLevel * gridSpacing);
    
    const direction = currentPrice < targetPrice ? 'long' : 'short';
    const size = strategy.positionSize / currentPrice;
    
    console.log(`   Grid ${direction} at level ${nearestLevel}`);
    
    const tx = await driftService.openPosition({
      marketIndex,
      direction,
      baseAssetAmount: Math.floor(size * 1e9),
      leverage: strategy.leverage,
    });

    return {
      success: true,
      strategyId: strategy.id,
      txSignature: tx,
      timestamp: new Date(),
      price: currentPrice,
      amount: strategy.positionSize,
      direction,
    };
  }

  /**
   * Execute Momentum strategy
   */
  private async executeMomentum(strategy: Strategy, currentPrice: number): Promise<ExecutionResult> {
    const marketIndex = DRIFT_MARKETS[strategy.market as keyof typeof DRIFT_MARKETS];
    
    const history = this.priceHistory.get(strategy.market) || [];
    const period = strategy.momentumPeriod || 20;
    const recentPrices = history.slice(-period);
    const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / period;
    
    const direction = currentPrice > avgPrice ? 'long' : 'short';
    const size = strategy.positionSize / currentPrice;
    
    console.log(`   Momentum ${direction} (${((currentPrice - avgPrice) / avgPrice * 100).toFixed(2)}%)`);
    
    const tx = await driftService.openPosition({
      marketIndex,
      direction,
      baseAssetAmount: Math.floor(size * 1e9),
      leverage: strategy.leverage,
    });

    return {
      success: true,
      strategyId: strategy.id,
      txSignature: tx,
      timestamp: new Date(),
      price: currentPrice,
      amount: strategy.positionSize,
      direction,
    };
  }

  /**
   * Execute Mean Reversion strategy
   */
  private async executeMeanReversion(strategy: Strategy, currentPrice: number): Promise<ExecutionResult> {
    const marketIndex = DRIFT_MARKETS[strategy.market as keyof typeof DRIFT_MARKETS];
    
    const history = this.priceHistory.get(strategy.market) || [];
    const period = strategy.rsiPeriod || 14;
    const recentPrices = history.slice(-period);
    const changes = recentPrices.slice(1).map((price, i) => price - recentPrices[i]);
    
    const gains = changes.filter(c => c > 0).reduce((sum, c) => sum + c, 0) / period;
    const losses = Math.abs(changes.filter(c => c < 0).reduce((sum, c) => sum + c, 0)) / period;
    const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
    
    const direction = rsi < (strategy.rsiOversold || 30) ? 'long' : 'short';
    const size = strategy.positionSize / currentPrice;
    
    console.log(`   Mean Reversion ${direction} (RSI: ${rsi.toFixed(2)})`);
    
    const tx = await driftService.openPosition({
      marketIndex,
      direction,
      baseAssetAmount: Math.floor(size * 1e9),
      leverage: strategy.leverage,
    });

    return {
      success: true,
      strategyId: strategy.id,
      txSignature: tx,
      timestamp: new Date(),
      price: currentPrice,
      amount: strategy.positionSize,
      direction,
    };
  }

  /**
   * Get minimum interval for strategy
   */
  private getMinInterval(strategy: Strategy): number {
    switch (strategy.type) {
      case 'dca':
        return (strategy.dcaInterval || 300) * 1000;
      case 'grid':
        return 30000; // 30 seconds
      case 'momentum':
        return 60000; // 1 minute
      case 'meanReversion':
        return 60000; // 1 minute
      default:
        return 60000;
    }
  }

  /**
   * Add a strategy
   */
  addStrategy(strategy: Omit<Strategy, 'id' | 'createdAt' | 'totalExecutions' | 'totalPnL' | 'status'>): string {
    const id = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullStrategy: Strategy = {
      ...strategy,
      id,
      createdAt: new Date(),
      totalExecutions: 0,
      totalPnL: 0,
      status: 'idle',
    };

    this.strategies.set(id, fullStrategy);
    console.log(`✅ Strategy added: ${strategy.name}`);
    
    return id;
  }

  /**
   * Remove a strategy
   */
  removeStrategy(id: string): boolean {
    const deleted = this.strategies.delete(id);
    if (deleted) {
      console.log(`✅ Strategy removed: ${id}`);
    }
    return deleted;
  }

  /**
   * Update a strategy
   */
  updateStrategy(id: string, updates: Partial<Strategy>): boolean {
    const strategy = this.strategies.get(id);
    if (!strategy) {
      return false;
    }

    Object.assign(strategy, updates);
    console.log(`✅ Strategy updated: ${strategy.name}`);
    return true;
  }

  /**
   * Get all strategies
   */
  getStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategy by ID
   */
  getStrategy(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }

  /**
   * Get bot state
   */
  getState(): BotState {
    return {
      isRunning: this.isRunning,
      strategies: this.getStrategies(),
      priceData: this.priceData,
      lastUpdate: new Date(),
      executionHistory: this.executionHistory,
    };
  }

  /**
   * Get current price for a market
   */
  getCurrentPrice(market: string): SimplePriceData | undefined {
    return this.priceData.get(market);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): ExecutionResult[] {
    return limit ? this.executionHistory.slice(-limit) : this.executionHistory;
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
    console.log('✅ Execution history cleared');
  }

  /**
   * Manually execute a strategy
   */
  async manualExecute(strategyId: string): Promise<ExecutionResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    console.log(`🎯 Manual execution: ${strategy.name}`);
    return await this.executeStrategy(strategy);
  }
}

// Export singleton
export const botExecutionService = new BotExecutionService();
