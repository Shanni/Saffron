// Drift Protocol Service for Saffron
// Handles all perpetual trading on Solana via Drift

import { Connection, PublicKey } from '@solana/web3.js';
import { DriftClient, User, PositionDirection, getMarketOrderParams, BASE_PRECISION, getUserAccountPublicKey, BulkAccountLoader } from '@drift-labs/sdk';
import { BN } from '@coral-xyz/anchor';
import { coinGeckoService } from './coinGeckoService';

// Market indices for Drift Protocol
export const DRIFT_MARKETS = {
  'SOL-PERP': 0,
  'BTC-PERP': 1,
  'ETH-PERP': 2,
  'BONK-PERP': 3,
  'JUP-PERP': 4,
} as const;

export interface DriftPositionParams {
  marketIndex: number;
  direction: 'long' | 'short';
  baseAssetAmount: number; // in base units (e.g., lamports for SOL)
  leverage?: number; // 1-10x
  reduceOnly?: boolean;
  stopLoss?: number;
  takeProfit?: number;
}

export interface DriftPosition {
  marketIndex: number;
  baseAssetAmount: string;
  quoteAssetAmount: string;
  lastCumulativeFundingRate: string;
  lastFundingRateTs: number;
  openOrders: number;
  settledPnl: string;
  lpShares: string;
}

export interface DriftMarketData {
  marketIndex: number;
  symbol: string;
  price: number;
  fundingRate: number;
  openInterest: number;
  volume24h: number;
}

class DriftService {
  private connection: Connection;
  private rpcUrl: string;
  private isInitialized: boolean = false;
  private wallet: any = null;
  private driftClient: DriftClient | null = null;
  private user: User | null = null;

  // Drift program IDs
  private readonly DRIFT_PROGRAM_ID = new PublicKey('HoMwfN4toaaMtPL7Z7mar2H2CFro8n4B2HkjuFUy6qLM');
  private DRIFT_ENV = 'devnet';

  constructor(rpcUrl?: string, env?: string) {
    this.rpcUrl = rpcUrl || process.env.EXPO_PUBLIC_SOLANA_RPC_URL || 'https://solana-devnet.api.onfinality.io/public';
    this.connection = new Connection(this.rpcUrl, 'confirmed');
    if (env) {
      this.DRIFT_ENV = env as any;
    }
  }

  /**
   * Initialize Drift client with wallet
   */
  async initialize(wallet: any): Promise<void> {
    if (this.isInitialized) {
      console.log('Drift already initialized');
      return;
    }

    try {
      this.wallet = wallet;
      
      console.log('Initializing Drift Protocol...');
      console.log('Wallet:', wallet.publicKey.toString());
      console.log('RPC:', this.rpcUrl);
      
      // Create bulk account loader for polling (more resilient to rate limits)
      const bulkAccountLoader = new BulkAccountLoader(
        this.connection,
        'confirmed',
        1000 // poll interval in ms
      );
      
      // Initialize Drift Client with polling subscription
      this.driftClient = new DriftClient({
        connection: this.connection,
        wallet: wallet,
        programID: this.DRIFT_PROGRAM_ID,
        env: this.DRIFT_ENV as any,
        accountSubscription: {
          type: 'polling',
          accountLoader: bulkAccountLoader,
        },
      });

      // Subscribe to Drift client
      await this.driftClient.subscribe();
      console.log('✅ Drift client subscribed');

      // Calculate user account public key manually
      const userAccountPublicKey = await getUserAccountPublicKey(
        this.DRIFT_PROGRAM_ID,
        wallet.publicKey,
        0 // subaccount ID
      );
      console.log('User account public key:', userAccountPublicKey.toString());

      // Initialize User with polling subscription
      this.user = new User({
        driftClient: this.driftClient,
        userAccountPublicKey,
        accountSubscription: {
          type: 'polling',
          accountLoader: bulkAccountLoader,
        },
      });
      
      // Check if user account exists
      const userAccountExists = await this.user.exists();
      
      if (!userAccountExists) {
        console.log('⚠️  User account does not exist, initializing...');
        // Initialize user account on-chain (without deposit for testing)
        const txSig = await this.driftClient.initializeUserAccount();
        console.log('✅ User account initialized:', txSig);
        
        // Wait for confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('✅ User account already exists');
      }

      // Subscribe to user account
      await this.user.subscribe();
      console.log('✅ User account subscribed');
      
      // Wait for market data to load (especially important on devnet)
      console.log('⏳ Waiting for market data to load...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ Market data should be loaded');
      
      this.isInitialized = true;
      console.log('✅ Drift initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Drift:', error);
      throw error;
    }
  }

  /**
   * Check if Drift is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.wallet !== null;
  }

  /**
   * Open a perpetual position on Drift
   */
  async openPosition(params: DriftPositionParams): Promise<string> {
    if (!this.isReady() || !this.driftClient) {
      throw new Error('Drift not initialized. Call initialize() first.');
    }

    const {
      marketIndex,
      direction,
      baseAssetAmount,
      leverage = 1,
      reduceOnly = false,
      stopLoss,
      takeProfit,
    } = params;

    try {
      console.log('Opening Drift position:', {
        market: this.getMarketSymbol(marketIndex),
        direction,
        amount: baseAssetAmount / 1e9,
        leverage,
      });

      // Place market order on Drift using the proper SDK method
      const orderParams = getMarketOrderParams({
        baseAssetAmount: new BN(baseAssetAmount),
        direction: direction === 'long' ? PositionDirection.LONG : PositionDirection.SHORT,
        marketIndex,
        reduceOnly,
      });
      
      const txSignature = await this.driftClient.placePerpOrder(orderParams);
      
      console.log('✅ Position opened:', txSignature);
      
      return txSignature;
    } catch (error) {
      console.error('❌ Failed to open position:', error);
      throw error;
    }
  }

  /**
   * Close a position on Drift
   */
  async closePosition(marketIndex: number): Promise<string> {
    if (!this.isReady() || !this.driftClient || !this.user) {
      throw new Error('Drift not initialized');
    }

    try {
      console.log('Closing Drift position:', this.getMarketSymbol(marketIndex));

      // Get current position
      const position = this.user.getPerpPosition(marketIndex);
      if (!position || position.baseAssetAmount.isZero()) {
        throw new Error('No position to close');
      }

      // Close position by placing opposite order
      const direction = position.baseAssetAmount.isNeg()
        ? PositionDirection.LONG
        : PositionDirection.SHORT;

      const orderParams = getMarketOrderParams({
        baseAssetAmount: position.baseAssetAmount.abs(),
        direction,
        marketIndex,
        reduceOnly: true,
      });
      
      const txSignature = await this.driftClient.placePerpOrder(orderParams);
      
      console.log('✅ Position closed:', txSignature);
      
      return txSignature;
    } catch (error) {
      console.error('❌ Failed to close position:', error);
      throw error;
    }
  }

  /**
   * Get current market price from Drift or CoinGecko
   */
  async getMarketPrice(marketIndex: number): Promise<number> {
    // Try CoinGecko first for real-time prices
    try {
      const marketSymbol = this.getMarketSymbol(marketIndex);
      const priceData = await coinGeckoService.getSimplePrice(marketSymbol);
      console.log(`✅ Real price from CoinGecko: $${priceData.price.toFixed(2)}`);
      return priceData.price;
    } catch (coinGeckoError: any) {
      console.warn(`⚠️  CoinGecko failed: ${coinGeckoError.message}`);
    }

    // Fallback to Drift
    if (!this.driftClient) {
      throw new Error('Drift not initialized');
    }

    try {
      const market = this.driftClient.getPerpMarketAccount(marketIndex);
      if (!market) {
        console.warn(`⚠️  Market ${marketIndex} not found on ${this.DRIFT_ENV}`);
        throw new Error('Market not found');
      }

      // Get mark price from AMM
      const price = market.amm.lastMarkPriceTwap.toNumber() / 1e6;
      
      if (price > 0) {
        console.log(`✅ Real price from Drift: $${price.toFixed(2)}`);
        return price;
      }
      
      throw new Error('Invalid price');
    } catch (error: any) {
      // Final fallback to mock prices
      const mockPrices: Record<number, number> = {
        0: 145.50, // SOL
        1: 67500.00, // BTC
        2: 3500.00, // ETH
        3: 0.000025, // BONK
        4: 1.15, // JUP
      };
      console.warn(`⚠️  Using fallback price for market ${marketIndex} on ${this.DRIFT_ENV}`);
      console.warn(`   Reason: ${error.message}`);
      return mockPrices[marketIndex] || 100;
    }
  }

  /**
   * Get market symbol from index
   */
  private getMarketSymbol(marketIndex: number): string {
    const symbols: Record<number, string> = {
      0: 'SOL-PERP',
      1: 'BTC-PERP',
      2: 'ETH-PERP',
      3: 'BONK-PERP',
      4: 'JUP-PERP',
    };
    return symbols[marketIndex] || 'SOL-PERP';
  }

  /**
   * Get all user positions
   */
  async getPositions(): Promise<DriftPosition[]> {
    if (!this.isReady() || !this.user) {
      throw new Error('Drift not initialized');
    }

    try {
      // Wait for user data to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const userAccount = this.user.getUserAccount();
      
      if (!userAccount || !userAccount.perpPositions) {
        console.warn('User account not fully loaded');
        return [];
      }
      
      const positions = userAccount.perpPositions.filter(
        (p) => !p.baseAssetAmount.isZero()
      );

      return positions.map(p => ({
        marketIndex: p.marketIndex,
        baseAssetAmount: p.baseAssetAmount.toString(),
        quoteAssetAmount: p.quoteAssetAmount.toString(),
        lastCumulativeFundingRate: p.lastCumulativeFundingRate.toString(),
        lastFundingRateTs: 0, // Not available in current SDK version
        openOrders: p.openOrders,
        settledPnl: p.settledPnl.toString(),
        lpShares: p.lpShares.toString(),
      }));
    } catch (error: any) {
      console.warn('Failed to get positions:', error.message);
      return [];
    }
  }

  /**
   * Get market data for a specific market
   */
  async getMarketData(marketIndex: number): Promise<DriftMarketData> {
    try {
      const price = await this.getMarketPrice(marketIndex);
      const symbol = this.getMarketSymbol(marketIndex);

      return {
        marketIndex,
        symbol,
        price,
        fundingRate: 0.0001, // 0.01% per hour
        openInterest: 1000000,
        volume24h: 5000000,
      };
    } catch (error) {
      console.error('Failed to get market data:', error);
      throw error;
    }
  }

  /**
   * Get funding rate for a market
   */
  async getFundingRate(marketIndex: number): Promise<number> {
    try {
      if (!this.driftClient) {
        throw new Error('Drift not initialized');
      }

      const market = this.driftClient.getPerpMarketAccount(marketIndex);
      if (!market) {
        throw new Error(`Market ${marketIndex} not found`);
      }

      // Get funding rate (in basis points per hour)
      const fundingRate = market.amm.lastFundingRate.toNumber() / 1e9;
      return fundingRate;
    } catch (error) {
      console.error('Failed to get funding rate:', error);
      return 0.0001; // Fallback
    }
  }

  /**
   * Calculate position size with leverage
   */
  calculatePositionSize(
    collateral: number,
    leverage: number,
    price: number
  ): number {
    return (collateral * leverage) / price;
  }

  /**
   * Calculate liquidation price
   */
  calculateLiquidationPrice(
    entryPrice: number,
    leverage: number,
    direction: 'long' | 'short'
  ): number {
    const maintenanceMarginRatio = 0.05; // 5%
    const liquidationBuffer = 1 / leverage - maintenanceMarginRatio;

    if (direction === 'long') {
      return entryPrice * (1 - liquidationBuffer);
    } else {
      return entryPrice * (1 + liquidationBuffer);
    }
  }

  /**
   * Get market symbol from index
   */
  private getMarketSymbol(marketIndex: number): string {
    const symbolMap: Record<number, string> = {
      0: 'SOL-PERP',
      1: 'BTC-PERP',
      2: 'ETH-PERP',
      3: 'BONK-PERP',
      4: 'JUP-PERP',
    };
    return symbolMap[marketIndex] || 'UNKNOWN';
  }

  /**
   * Get market index from symbol
   */
  getMarketIndex(symbol: string): number {
    return DRIFT_MARKETS[symbol as keyof typeof DRIFT_MARKETS] ?? 0;
  }

  /**
   * Disconnect from Drift
   */
  async disconnect(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (this.user) {
        await this.user.unsubscribe();
        this.user = null;
      }

      if (this.driftClient) {
        await this.driftClient.unsubscribe();
        this.driftClient = null;
      }
      
      this.isInitialized = false;
      this.wallet = null;
      
      console.log('✅ Drift disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
      throw error;
    }
  }
}

// Export class for custom instances
export { DriftService };

// Export singleton instance (default)
export const driftService = new DriftService();
