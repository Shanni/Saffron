// Price Monitor Service
// Monitors market prices and triggers strategy execution

import { driftService } from './driftService';

export interface PriceAlert {
  id: string;
  market: string;
  targetPrice: number;
  condition: 'above' | 'below' | 'crosses';
  strategy: 'dca' | 'grid' | 'momentum' | 'meanReversion';
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

export interface PriceData {
  market: string;
  price: number;
  timestamp: Date;
  change24h?: number;
}

class PriceMonitorService {
  private alerts: Map<string, PriceAlert> = new Map();
  private priceHistory: Map<string, PriceData[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITOR_INTERVAL_MS = 10000; // 10 seconds
  private readonly HISTORY_LENGTH = 100; // Keep last 100 price points

  /**
   * Start monitoring prices
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('⚠️  Price monitoring already running');
      return;
    }

    console.log('🚀 Starting price monitoring...');
    console.log(`   Interval: ${this.MONITOR_INTERVAL_MS / 1000}s`);
    
    // Initial check
    this.checkPrices();
    
    // Set up interval
    this.monitoringInterval = setInterval(() => {
      this.checkPrices();
    }, this.MONITOR_INTERVAL_MS);

    console.log('✅ Price monitoring started');
  }

  /**
   * Stop monitoring prices
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Price monitoring stopped');
    }
  }

  /**
   * Check all markets and trigger alerts
   */
  private async checkPrices(): Promise<void> {
    try {
      const markets = ['SOL-PERP', 'BTC-PERP', 'ETH-PERP'];
      
      for (const market of markets) {
        const marketIndex = driftService.getMarketIndex(market);
        const price = await driftService.getMarketPrice(marketIndex);
        
        // Store price data
        this.storePriceData(market, price);
        
        // Check alerts for this market
        this.checkAlertsForMarket(market, price);
      }
    } catch (error) {
      console.error('❌ Error checking prices:', error);
    }
  }

  /**
   * Store price data in history
   */
  private storePriceData(market: string, price: number): void {
    if (!this.priceHistory.has(market)) {
      this.priceHistory.set(market, []);
    }

    const history = this.priceHistory.get(market)!;
    const priceData: PriceData = {
      market,
      price,
      timestamp: new Date(),
    };

    // Calculate 24h change if we have enough data
    if (history.length > 0) {
      const oldestPrice = history[0].price;
      priceData.change24h = ((price - oldestPrice) / oldestPrice) * 100;
    }

    history.push(priceData);

    // Keep only last N prices
    if (history.length > this.HISTORY_LENGTH) {
      history.shift();
    }

    console.log(`📊 ${market}: $${price.toFixed(2)} ${priceData.change24h ? `(${priceData.change24h > 0 ? '+' : ''}${priceData.change24h.toFixed(2)}%)` : ''}`);
  }

  /**
   * Check alerts for a specific market
   */
  private checkAlertsForMarket(market: string, currentPrice: number): void {
    for (const [id, alert] of this.alerts.entries()) {
      if (!alert.isActive || alert.market !== market) {
        continue;
      }

      let shouldTrigger = false;

      switch (alert.condition) {
        case 'above':
          shouldTrigger = currentPrice > alert.targetPrice;
          break;
        case 'below':
          shouldTrigger = currentPrice < alert.targetPrice;
          break;
        case 'crosses':
          // Check if price crossed the target
          const history = this.priceHistory.get(market);
          if (history && history.length >= 2) {
            const prevPrice = history[history.length - 2].price;
            shouldTrigger = 
              (prevPrice < alert.targetPrice && currentPrice >= alert.targetPrice) ||
              (prevPrice > alert.targetPrice && currentPrice <= alert.targetPrice);
          }
          break;
      }

      if (shouldTrigger) {
        this.triggerAlert(alert, currentPrice);
      }
    }
  }

  /**
   * Trigger an alert and execute strategy
   */
  private async triggerAlert(alert: PriceAlert, currentPrice: number): Promise<void> {
    console.log(`\n🔔 ALERT TRIGGERED!`);
    console.log(`   Market: ${alert.market}`);
    console.log(`   Target: $${alert.targetPrice}`);
    console.log(`   Current: $${currentPrice}`);
    console.log(`   Strategy: ${alert.strategy}`);

    // Mark as triggered
    alert.isActive = false;
    alert.triggeredAt = new Date();

    // Execute strategy (will be implemented by strategy engine)
    try {
      // Strategy execution will be handled by strategyEngine
      console.log(`   Executing ${alert.strategy} strategy...`);
      // await strategyEngine.execute(alert.strategy, alert.market);
    } catch (error) {
      console.error(`   ❌ Failed to execute strategy:`, error);
    }
  }

  /**
   * Add a price alert
   */
  addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAlert: PriceAlert = {
      ...alert,
      id,
      createdAt: new Date(),
    };

    this.alerts.set(id, fullAlert);
    console.log(`✅ Alert added: ${alert.market} ${alert.condition} $${alert.targetPrice}`);
    
    return id;
  }

  /**
   * Remove an alert
   */
  removeAlert(id: string): boolean {
    const deleted = this.alerts.delete(id);
    if (deleted) {
      console.log(`✅ Alert removed: ${id}`);
    }
    return deleted;
  }

  /**
   * Get all alerts
   */
  getAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.isActive);
  }

  /**
   * Get price history for a market
   */
  getPriceHistory(market: string): PriceData[] {
    return this.priceHistory.get(market) || [];
  }

  /**
   * Get latest price for a market
   */
  getLatestPrice(market: string): PriceData | null {
    const history = this.priceHistory.get(market);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts.clear();
    console.log('✅ All alerts cleared');
  }

  /**
   * Get monitoring status
   */
  isMonitoring(): boolean {
    return this.monitoringInterval !== null;
  }
}

// Export singleton
export const priceMonitor = new PriceMonitorService();
