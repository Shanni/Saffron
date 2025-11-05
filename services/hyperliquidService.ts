// Hyperliquid Service for Saffron
// Handles high leverage trading and arbitrage on Hyperliquid L1

export interface HyperliquidOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  leverage: number;
  orderType: 'market' | 'limit';
  price?: number;
  reduceOnly?: boolean;
}

export interface HyperliquidPosition {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

export interface HyperliquidMarketData {
  symbol: string;
  price: number;
  fundingRate: number;
  openInterest: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

class HyperliquidService {
  private isInitialized: boolean = false;
  private wallet: any = null;
  private apiUrl: string = 'https://api.hyperliquid.xyz';

  // Hyperliquid supports 180+ assets
  private readonly SUPPORTED_MARKETS = [
    'SOL', 'BTC', 'ETH', 'BONK', 'JUP', 'WIF', 'RNDR', 'JTO',
    'PYTH', 'ORCA', 'RAY', 'MNGO', 'STEP', 'COPE', 'MEDIA'
  ];

  constructor() {}

  /**
   * Initialize Hyperliquid with wallet
   */
  async initialize(wallet: any): Promise<void> {
    if (this.isInitialized) {
      console.log('Hyperliquid already initialized');
      return;
    }

    try {
      this.wallet = wallet;

      // In production:
      // 1. Connect to Hyperliquid via Arbitrum
      // 2. Initialize Hyperliquid SDK
      // 3. Check USDC balance on Arbitrum
      
      console.log('Hyperliquid initialized successfully');
      console.log('Wallet:', wallet.publicKey?.toString() || wallet.address);
      console.log('API:', this.apiUrl);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Hyperliquid:', error);
      throw error;
    }
  }

  /**
   * Check if Hyperliquid is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.wallet !== null;
  }

  /**
   * Place an order on Hyperliquid
   */
  async placeOrder(params: HyperliquidOrderParams): Promise<string> {
    if (!this.isReady()) {
      throw new Error('Hyperliquid not initialized. Call initialize() first.');
    }

    const {
      symbol,
      side,
      size,
      leverage,
      orderType,
      price,
      reduceOnly = false,
    } = params;

    try {
      console.log('Placing Hyperliquid order:', {
        symbol,
        side,
        size,
        leverage,
        orderType,
        price,
      });

      // In production:
      // const order = await hyperliquidClient.placeOrder({
      //   asset: symbol,
      //   isBuy: side === 'buy',
      //   sz: size,
      //   limitPx: price,
      //   orderType: { limit: { tif: 'Gtc' } },
      //   reduceOnly,
      // });

      const orderId = `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Order placed:', orderId);
      
      return orderId;
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }

  /**
   * Close a position on Hyperliquid
   */
  async closePosition(symbol: string): Promise<string> {
    if (!this.isReady()) {
      throw new Error('Hyperliquid not initialized');
    }

    try {
      console.log('Closing Hyperliquid position:', symbol);

      // In production:
      // const order = await hyperliquidClient.closePosition(symbol);

      const orderId = `hl_close_${Date.now()}`;
      
      console.log('Position closed:', orderId);
      
      return orderId;
    } catch (error) {
      console.error('Failed to close position:', error);
      throw error;
    }
  }

  /**
   * Get current market price
   */
  async getMarketPrice(symbol: string): Promise<number> {
    try {
      // In production:
      // const response = await fetch(`${this.apiUrl}/info`);
      // const data = await response.json();
      // return data.universe.find(m => m.name === symbol)?.markPx;

      // Mock prices for testing
      const mockPrices: Record<string, number> = {
        'SOL': 145.75,
        'BTC': 67550.00,
        'ETH': 3505.00,
        'BONK': 0.000026,
        'JUP': 1.16,
        'WIF': 2.45,
      };

      return mockPrices[symbol] || 100;
    } catch (error) {
      console.error('Failed to get market price:', error);
      throw error;
    }
  }

  /**
   * Get all user positions
   */
  async getPositions(): Promise<HyperliquidPosition[]> {
    if (!this.isReady()) {
      throw new Error('Hyperliquid not initialized');
    }

    try {
      // In production:
      // const response = await fetch(`${this.apiUrl}/clearinghouseState`, {
      //   method: 'POST',
      //   body: JSON.stringify({ user: this.wallet.address }),
      // });
      // const data = await response.json();
      // return data.assetPositions;

      // Mock positions for testing
      return [];
    } catch (error) {
      console.error('Failed to get positions:', error);
      throw error;
    }
  }

  /**
   * Get market data
   */
  async getMarketData(symbol: string): Promise<HyperliquidMarketData> {
    try {
      const price = await this.getMarketPrice(symbol);

      return {
        symbol,
        price,
        fundingRate: 0.00005, // 0.005% per hour
        openInterest: 2000000,
        volume24h: 10000000,
        high24h: price * 1.02,
        low24h: price * 0.98,
      };
    } catch (error) {
      console.error('Failed to get market data:', error);
      throw error;
    }
  }

  /**
   * Get funding rate
   */
  async getFundingRate(symbol: string): Promise<number> {
    try {
      // In production:
      // const response = await fetch(`${this.apiUrl}/info`);
      // const data = await response.json();
      // return data.universe.find(m => m.name === symbol)?.funding;

      return 0.00005; // 0.005% per hour
    } catch (error) {
      console.error('Failed to get funding rate:', error);
      throw error;
    }
  }

  /**
   * Calculate liquidation price
   */
  calculateLiquidationPrice(
    entryPrice: number,
    leverage: number,
    side: 'long' | 'short'
  ): number {
    const maintenanceMarginRatio = 0.03; // 3% for Hyperliquid
    const liquidationBuffer = 1 / leverage - maintenanceMarginRatio;

    if (side === 'long') {
      return entryPrice * (1 - liquidationBuffer);
    } else {
      return entryPrice * (1 + liquidationBuffer);
    }
  }

  /**
   * Check if symbol is supported
   */
  isSymbolSupported(symbol: string): boolean {
    return this.SUPPORTED_MARKETS.includes(symbol);
  }

  /**
   * Get all supported markets
   */
  getSupportedMarkets(): string[] {
    return [...this.SUPPORTED_MARKETS];
  }

  /**
   * Disconnect from Hyperliquid
   */
  async disconnect(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.isInitialized = false;
      this.wallet = null;
      
      console.log('Hyperliquid disconnected');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const hyperliquidService = new HyperliquidService();
