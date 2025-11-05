// CoinGecko Service - Real market data
// Free API, no key required

export interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface SimplePriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated: Date;
}

class CoinGeckoService {
  private readonly BASE_URL = 'https://api.coingecko.com/api/v3';
  private priceCache: Map<string, { data: SimplePriceData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private updateInterval: any = null;
  private readonly UPDATE_INTERVAL_MS = 30000; // Fetch every 30 seconds

  // Map trading symbols to CoinGecko IDs
  private readonly SYMBOL_MAP: Record<string, string> = {
    'SOL': 'solana',
    'SOL-PERP': 'solana',
    'BTC': 'bitcoin',
    'BTC-PERP': 'bitcoin',
    'ETH': 'ethereum',
    'ETH-PERP': 'ethereum',
    'BONK': 'bonk',
    'BONK-PERP': 'bonk',
    'JUP': 'jupiter-exchange-solana',
    'JUP-PERP': 'jupiter-exchange-solana',
  };

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<number> {
    const data = await this.getSimplePrice(symbol);
    return data.price;
  }

  /**
   * Get simple price data with caching
   */
  async getSimplePrice(symbol: string): Promise<SimplePriceData> {
    // Check cache
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Fetch fresh data
    const coinId = this.SYMBOL_MAP[symbol] || this.SYMBOL_MAP[symbol.replace('-PERP', '')];
    if (!coinId) {
      throw new Error(`Unknown symbol: ${symbol}`);
    }

    try {
      const url = `${this.BASE_URL}/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoPrice[] = await response.json();
      if (!data || data.length === 0) {
        throw new Error(`No data for ${symbol}`);
      }

      const coin = data[0];
      const priceData: SimplePriceData = {
        symbol,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        volume24h: coin.total_volume,
        lastUpdated: new Date(coin.last_updated),
      };

      // Cache the data
      this.priceCache.set(symbol, {
        data: priceData,
        timestamp: Date.now(),
      });

      return priceData;
    } catch (error: any) {
      console.error(`Failed to fetch price for ${symbol}:`, error.message);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.warn(`Using expired cache for ${symbol}`);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Get detailed market data
   */
  async getDetailedMarketData(symbol: string): Promise<CoinGeckoPrice> {
    const coinId = this.SYMBOL_MAP[symbol] || this.SYMBOL_MAP[symbol.replace('-PERP', '')];
    if (!coinId) {
      throw new Error(`Unknown symbol: ${symbol}`);
    }

    const url = `${this.BASE_URL}/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoPrice[] = await response.json();
    if (!data || data.length === 0) {
      throw new Error(`No data for ${symbol}`);
    }

    return data[0];
  }

  /**
   * Get prices for multiple symbols
   */
  async getMultiplePrices(symbols: string[]): Promise<Map<string, SimplePriceData>> {
    const results = new Map<string, SimplePriceData>();
    
    // Get unique coin IDs
    const coinIds = [...new Set(symbols.map(s => 
      this.SYMBOL_MAP[s] || this.SYMBOL_MAP[s.replace('-PERP', '')]
    ))].filter(Boolean);

    if (coinIds.length === 0) {
      throw new Error('No valid symbols provided');
    }

    try {
      const url = `${this.BASE_URL}/coins/markets?vs_currency=usd&ids=${coinIds.join(',')}&order=market_cap_desc&per_page=${coinIds.length}&page=1&sparkline=false`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoPrice[] = await response.json();
      
      // Map back to symbols
      symbols.forEach(symbol => {
        const coinId = this.SYMBOL_MAP[symbol] || this.SYMBOL_MAP[symbol.replace('-PERP', '')];
        const coin = data.find(c => c.id === coinId);
        
        if (coin) {
          const priceData: SimplePriceData = {
            symbol,
            price: coin.current_price,
            change24h: coin.price_change_percentage_24h,
            high24h: coin.high_24h,
            low24h: coin.low_24h,
            volume24h: coin.total_volume,
            lastUpdated: new Date(coin.last_updated),
          };
          
          results.set(symbol, priceData);
          
          // Cache individual prices
          this.priceCache.set(symbol, {
            data: priceData,
            timestamp: Date.now(),
          });
        }
      });

      return results;
    } catch (error: any) {
      console.error('Failed to fetch multiple prices:', error.message);
      throw error;
    }
  }

  /**
   * Get historical prices (last 24h)
   */
  async getHistoricalPrices(symbol: string, days: number = 1): Promise<Array<{ timestamp: Date; price: number }>> {
    const cleanSymbol = symbol.trim();
    const coinId = this.SYMBOL_MAP[cleanSymbol] || this.SYMBOL_MAP[cleanSymbol.replace('-PERP', '')];
    if (!coinId) {
      throw new Error(`Unknown symbol: ${symbol}`);
    }

    if (!Number.isFinite(days) || days <= 0) {
      throw new Error(`Invalid days parameter: ${days}`);
    }

    try {
      const url = new URL(`${this.BASE_URL}/coins/${coinId}/market_chart`);
      url.searchParams.set('vs_currency', 'usd');
      url.searchParams.set('days', days.toString());

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.prices)) {
        throw new Error(`Unexpected response shape for ${symbol}`);
      }

      return data.prices.map((point: [number, number]) => ({
        timestamp: new Date(point[0]),
        price: point[1],
      }));
    } catch (error: any) {
      console.error(`Failed to fetch historical prices for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.priceCache.clear();
    console.log('✅ Price cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; symbols: string[] } {
    return {
      size: this.priceCache.size,
      symbols: Array.from(this.priceCache.keys()),
    };
  }

  /**
   * Start automatic price updates every 30 seconds
   */
  startAutoUpdate(symbols: string[]): void {
    if (this.updateInterval) {
      console.log('⚠️  Auto-update already running');
      return;
    }

    console.log(`🔄 Starting auto-update for ${symbols.length} symbols (every 30s)`);

    // Initial fetch
    this.getMultiplePrices(symbols).catch(err => 
      console.error('Failed initial fetch:', err.message)
    );

    // Set up interval
    this.updateInterval = setInterval(async () => {
      try {
        await this.getMultiplePrices(symbols);
        console.log(`✅ Prices updated: ${symbols.join(', ')}`);
      } catch (error: any) {
        console.error('Failed to update prices:', error.message);
      }
    }, this.UPDATE_INTERVAL_MS);

    console.log('✅ Auto-update started');
  }

  /**
   * Stop automatic price updates
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('🛑 Auto-update stopped');
    }
  }

  /**
   * Check if auto-update is running
   */
  isAutoUpdateRunning(): boolean {
    return this.updateInterval !== null;
  }

  /**
   * Check if symbol is supported
   */
  isSupported(symbol: string): boolean {
    return symbol in this.SYMBOL_MAP || symbol.replace('-PERP', '') in this.SYMBOL_MAP;
  }

  /**
   * Get all supported symbols
   */
  getSupportedSymbols(): string[] {
    return Object.keys(this.SYMBOL_MAP);
  }
}

// Export singleton
export const coinGeckoService = new CoinGeckoService();
