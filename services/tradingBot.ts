// Trading Bot - Integrates Price Monitor + Strategy Engine + Drift
// Automated trading bot with cron jobs and strategy execution

import { driftService, DRIFT_MARKETS } from './driftService';
import { priceMonitor, PriceAlert } from './priceMonitor';

export interface BotConfig {
  enabled: boolean;
  monitoringInterval: number; // seconds
  strategies: BotStrategy[];
}

export interface BotStrategy {
  id: string;
  name: string;
  type: 'dca' | 'grid' | 'momentum' | 'meanReversion';
  market: string;
  enabled: boolean;
  
  // Trigger conditions
  triggerType: 'price' | 'time' | 'indicator';
  triggerPrice?: number;
  triggerCondition?: 'above' | 'below' | 'crosses';
  triggerInterval?: number; // seconds for time-based
  
  // Strategy parameters
  leverage: number;
  positionSize: number; // in USD
  stopLoss: number; // percentage
  takeProfit: number; // percentage
  
  // DCA specific
  dcaInterval?: number; // seconds
  dcaAmount?: number; // USD per buy
  
  // Grid specific
  gridLevels?: number;
  gridSpacing?: number; // percentage
  gridRange?: { min: number; max: number };
  
  // Momentum specific
  momentumPeriod?: number; // candles
  momentumThreshold?: number; // percentage
  
  // Mean Reversion specific
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
  bollingerPeriod?: number;
  
  // Execution
  lastExecuted?: Date;
  totalExecutions: number;
  totalPnL: number;
}

export interface BotStatus {
  isRunning: boolean;
  activeStrategies: number;
  totalAlerts: number;
  activeAlerts: number;
  lastCheck: Date;
  uptime: number; // seconds
}

class TradingBot {
  private config: BotConfig = {
    enabled: false,
    monitoringInterval: 10, // 10 seconds
    strategies: [],
  };
  
  private strategies: Map<string, BotStrategy> = new Map();
  private startTime: Date | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the trading bot
   */
  async initialize(wallet: any): Promise<void> {
    console.log('🤖 Initializing Trading Bot...\n');
    
    // Initialize Drift service
    if (!driftService.isReady()) {
      console.log('Initializing Drift Protocol...');
      await driftService.initialize(wallet);
      console.log('✅ Drift initialized\n');
    }
    
    console.log('✅ Trading Bot initialized');
  }

  /**
   * Start the trading bot
   */
  start(): void {
    if (this.config.enabled) {
      console.log('⚠️  Bot already running');
      return;
    }

    console.log('🚀 Starting Trading Bot...\n');
    
    this.config.enabled = true;
    this.startTime = new Date();
    
    // Start price monitoring
    priceMonitor.startMonitoring();
    
    // Start strategy execution loop
    this.startStrategyLoop();
    
    console.log('✅ Trading Bot started');
    console.log(`   Monitoring interval: ${this.config.monitoringInterval}s`);
    console.log(`   Active strategies: ${this.getActiveStrategies().length}\n`);
  }

  /**
   * Stop the trading bot
   */
  stop(): void {
    if (!this.config.enabled) {
      console.log('⚠️  Bot not running');
      return;
    }

    console.log('🛑 Stopping Trading Bot...\n');
    
    this.config.enabled = false;
    
    // Stop price monitoring
    priceMonitor.stopMonitoring();
    
    // Stop strategy loop
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    console.log('✅ Trading Bot stopped');
  }

  /**
   * Start the strategy execution loop
   */
  private startStrategyLoop(): void {
    const intervalMs = this.config.monitoringInterval * 1000;
    
    // Initial check
    this.checkStrategies();
    
    // Set up interval
    this.checkInterval = setInterval(() => {
      this.checkStrategies();
    }, intervalMs);
  }

  /**
   * Check all strategies and execute if conditions met
   */
  private async checkStrategies(): Promise<void> {
    const activeStrategies = this.getActiveStrategies();
    
    for (const strategy of activeStrategies) {
      try {
        await this.checkStrategy(strategy);
      } catch (error) {
        console.error(`❌ Error checking strategy ${strategy.name}:`, error);
      }
    }
  }

  /**
   * Check a single strategy
   */
  private async checkStrategy(strategy: BotStrategy): Promise<void> {
    // Check if enough time has passed since last execution
    if (strategy.lastExecuted) {
      const timeSinceExecution = Date.now() - strategy.lastExecuted.getTime();
      const minInterval = this.getMinInterval(strategy);
      
      if (timeSinceExecution < minInterval) {
        return; // Too soon to execute again
      }
    }

    // Get current price
    const marketIndex = DRIFT_MARKETS[strategy.market as keyof typeof DRIFT_MARKETS];
    const currentPrice = await driftService.getMarketPrice(marketIndex);

    // Check trigger conditions
    const shouldExecute = await this.shouldExecuteStrategy(strategy, currentPrice);
    
    if (shouldExecute) {
      await this.executeStrategy(strategy, currentPrice);
    }
  }

  /**
   * Determine if strategy should execute
   */
  private async shouldExecuteStrategy(strategy: BotStrategy, currentPrice: number): Promise<boolean> {
    switch (strategy.triggerType) {
      case 'price':
        return this.checkPriceTrigger(strategy, currentPrice);
      
      case 'time':
        return this.checkTimeTrigger(strategy);
      
      case 'indicator':
        return await this.checkIndicatorTrigger(strategy, currentPrice);
      
      default:
        return false;
    }
  }

  /**
   * Check price-based trigger
   */
  private checkPriceTrigger(strategy: BotStrategy, currentPrice: number): boolean {
    if (!strategy.triggerPrice || !strategy.triggerCondition) {
      return false;
    }

    switch (strategy.triggerCondition) {
      case 'above':
        return currentPrice > strategy.triggerPrice;
      case 'below':
        return currentPrice < strategy.triggerPrice;
      case 'crosses':
        // Would need price history to detect crosses
        return false;
      default:
        return false;
    }
  }

  /**
   * Check time-based trigger
   */
  private checkTimeTrigger(strategy: BotStrategy): boolean {
    if (!strategy.triggerInterval) {
      return false;
    }

    if (!strategy.lastExecuted) {
      return true; // First execution
    }

    const timeSinceExecution = Date.now() - strategy.lastExecuted.getTime();
    return timeSinceExecution >= strategy.triggerInterval * 1000;
  }

  /**
   * Check indicator-based trigger
   */
  private async checkIndicatorTrigger(strategy: BotStrategy, currentPrice: number): Promise<boolean> {
    // Implement based on strategy type
    switch (strategy.type) {
      case 'momentum':
        return this.checkMomentumIndicator(strategy, currentPrice);
      
      case 'meanReversion':
        return this.checkMeanReversionIndicator(strategy, currentPrice);
      
      default:
        return false;
    }
  }

  /**
   * Check momentum indicators
   */
  private checkMomentumIndicator(strategy: BotStrategy, currentPrice: number): boolean {
    // Simplified momentum check
    // In production, would use real technical indicators
    const priceHistory = priceMonitor.getPriceHistory(strategy.market);
    
    if (priceHistory.length < (strategy.momentumPeriod || 20)) {
      return false;
    }

    const recentPrices = priceHistory.slice(-(strategy.momentumPeriod || 20));
    const avgPrice = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
    const momentum = ((currentPrice - avgPrice) / avgPrice) * 100;

    return Math.abs(momentum) > (strategy.momentumThreshold || 2);
  }

  /**
   * Check mean reversion indicators
   */
  private checkMeanReversionIndicator(strategy: BotStrategy, currentPrice: number): boolean {
    // Simplified RSI/Bollinger check
    const priceHistory = priceMonitor.getPriceHistory(strategy.market);
    
    if (priceHistory.length < (strategy.rsiPeriod || 14)) {
      return false;
    }

    // Calculate simple RSI
    const period = strategy.rsiPeriod || 14;
    const recentPrices = priceHistory.slice(-period).map(p => p.price);
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
  private async executeStrategy(strategy: BotStrategy, currentPrice: number): Promise<void> {
    console.log(`\n🎯 Executing ${strategy.type} strategy: ${strategy.name}`);
    console.log(`   Market: ${strategy.market}`);
    console.log(`   Price: $${currentPrice.toFixed(2)}`);

    try {
      let result;

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
      }

      if (result) {
        strategy.lastExecuted = new Date();
        strategy.totalExecutions++;
        console.log(`✅ Strategy executed successfully`);
        console.log(`   TX: ${result}\n`);
      }
    } catch (error: any) {
      console.error(`❌ Strategy execution failed:`, error.message);
    }
  }

  /**
   * Execute DCA strategy
   */
  private async executeDCA(strategy: BotStrategy, currentPrice: number): Promise<string | null> {
    const amount = strategy.dcaAmount || strategy.positionSize;
    const marketIndex = DRIFT_MARKETS[strategy.market as keyof typeof DRIFT_MARKETS];
    
    console.log(`   DCA buy: $${amount} worth`);
    
    const baseAssetAmount = (amount / currentPrice) * 1e9; // Convert to base units
    
    const tx = await driftService.openPosition({
      marketIndex,
      direction: 'long',
      baseAssetAmount: Math.floor(baseAssetAmount),
      leverage: strategy.leverage,
    });

    return tx;
  }

  /**
   * Execute Grid strategy
   */
  private async executeGrid(strategy: BotStrategy, currentPrice: number): Promise<string | null> {
    const marketIndex = DRIFT_MARKETS[strategy.market as keyof typeof DRIFT_MARKETS];
    
    // Determine grid level and direction
    const gridRange = strategy.gridRange || { min: currentPrice * 0.95, max: currentPrice * 1.05 };
    const gridLevels = strategy.gridLevels || 10;
    const gridSpacing = (gridRange.max - gridRange.min) / gridLevels;
    
    // Find nearest grid level
    const nearestLevel = Math.round((currentPrice - gridRange.min) / gridSpacing);
    const targetPrice = gridRange.min + (nearestLevel * gridSpacing);
    
    // Buy below, sell above
    const direction = currentPrice < targetPrice ? 'long' : 'short';
    const size = strategy.positionSize / currentPrice;
    
    console.log(`   Grid ${direction} at level ${nearestLevel}`);
    
    const tx = await driftService.openPosition({
      marketIndex,
      direction,
      baseAssetAmount: Math.floor(size * 1e9),
      leverage: strategy.leverage,
    });

    return tx;
  }

  /**
   * Execute Momentum strategy
   */
  private async executeMomentum(strategy: BotStrategy, currentPrice: number): Promise<string | null> {
    const marketIndex = DRIFT_MARKETS[strategy.market as keyof typeof DRIFT_MARKETS];
    
    // Determine direction based on momentum
    const priceHistory = priceMonitor.getPriceHistory(strategy.market);
    const recentPrices = priceHistory.slice(-(strategy.momentumPeriod || 20));
    const avgPrice = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
    
    const direction = currentPrice > avgPrice ? 'long' : 'short';
    const size = strategy.positionSize / currentPrice;
    
    console.log(`   Momentum ${direction} (price vs MA: ${((currentPrice - avgPrice) / avgPrice * 100).toFixed(2)}%)`);
    
    const tx = await driftService.openPosition({
      marketIndex,
      direction,
      baseAssetAmount: Math.floor(size * 1e9),
      leverage: strategy.leverage,
    });

    return tx;
  }

  /**
   * Execute Mean Reversion strategy
   */
  private async executeMeanReversion(strategy: BotStrategy, currentPrice: number): Promise<string | null> {
    const marketIndex = DRIFT_MARKETS[strategy.market as keyof typeof DRIFT_MARKETS];
    
    // Calculate RSI to determine direction
    const priceHistory = priceMonitor.getPriceHistory(strategy.market);
    const period = strategy.rsiPeriod || 14;
    const recentPrices = priceHistory.slice(-period).map(p => p.price);
    const changes = recentPrices.slice(1).map((price, i) => price - recentPrices[i]);
    
    const gains = changes.filter(c => c > 0).reduce((sum, c) => sum + c, 0) / period;
    const losses = Math.abs(changes.filter(c => c < 0).reduce((sum, c) => sum + c, 0)) / period;
    const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
    
    // Buy when oversold, sell when overbought
    const direction = rsi < (strategy.rsiOversold || 30) ? 'long' : 'short';
    const size = strategy.positionSize / currentPrice;
    
    console.log(`   Mean Reversion ${direction} (RSI: ${rsi.toFixed(2)})`);
    
    const tx = await driftService.openPosition({
      marketIndex,
      direction,
      baseAssetAmount: Math.floor(size * 1e9),
      leverage: strategy.leverage,
    });

    return tx;
  }

  /**
   * Get minimum interval for strategy
   */
  private getMinInterval(strategy: BotStrategy): number {
    switch (strategy.type) {
      case 'dca':
        return (strategy.dcaInterval || 300) * 1000; // 5 minutes default
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
  addStrategy(strategy: Omit<BotStrategy, 'id' | 'totalExecutions' | 'totalPnL'>): string {
    const id = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullStrategy: BotStrategy = {
      ...strategy,
      id,
      totalExecutions: 0,
      totalPnL: 0,
    };

    this.strategies.set(id, fullStrategy);
    this.config.strategies.push(fullStrategy);
    
    console.log(`✅ Strategy added: ${strategy.name} (${strategy.type})`);
    
    return id;
  }

  /**
   * Remove a strategy
   */
  removeStrategy(id: string): boolean {
    const deleted = this.strategies.delete(id);
    if (deleted) {
      this.config.strategies = this.config.strategies.filter(s => s.id !== id);
      console.log(`✅ Strategy removed: ${id}`);
    }
    return deleted;
  }

  /**
   * Get all strategies
   */
  getStrategies(): BotStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get active strategies
   */
  getActiveStrategies(): BotStrategy[] {
    return Array.from(this.strategies.values()).filter(s => s.enabled);
  }

  /**
   * Get bot status
   */
  getStatus(): BotStatus {
    const uptime = this.startTime 
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    return {
      isRunning: this.config.enabled,
      activeStrategies: this.getActiveStrategies().length,
      totalAlerts: priceMonitor.getAlerts().length,
      activeAlerts: priceMonitor.getActiveAlerts().length,
      lastCheck: new Date(),
      uptime,
    };
  }

  /**
   * Add price alert
   */
  addPriceAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): string {
    return priceMonitor.addAlert(alert);
  }

  /**
   * Get price alerts
   */
  getPriceAlerts(): PriceAlert[] {
    return priceMonitor.getAlerts();
  }
}

// Export singleton
export const tradingBot = new TradingBot();
