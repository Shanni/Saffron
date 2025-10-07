/**
 * Backend API Client for Saffron
 * Connects to the backend API server
 */

const API_BASE_URL = 'http://localhost:3000/api';

export interface Market {
  symbol: string;
  full_symbol: string;
  market_addr: string;
  base_addr: string;
  base_decimals: number;
  quote_addr: string;
  quote_decimals: number;
  min_order_size: number;
  max_leverage: number;
  mark_price: number;
  oracle_price: number;
  open_interest: number;
}

export interface TradePreview {
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  type: 'market' | 'limit';
  leverage: number;
  estimatedFees: string;
  feeRate: number;
  notionalValue: string;
  marketInfo: Market;
  valid: boolean;
  error?: string;
}

export interface TradeRequest {
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  type: 'market' | 'limit';
  price?: number;
  leverage?: number;
  nonce: number;
  signature: string;
}

export interface TradeResult {
  committed: boolean;
  sid: string;
  orderIds: string[];
  seq: number;
  timestamp: number;
  version: number;
}

export interface AuthResponse {
  token: string;
  publicKey: string;
  expiresIn: string;
}

class BackendAPIClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Login with public key
   */
  async login(publicKey: string, signature?: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicKey, signature }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.token = data.token;
    return data;
  }

  /**
   * Get all markets
   */
  async getMarkets(): Promise<Market[]> {
    const response = await fetch(`${this.baseUrl}/trade/markets`);

    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.data : [];
  }

  /**
   * Get market info for a specific symbol
   */
  async getMarket(symbol: string): Promise<Market | null> {
    const response = await fetch(`${this.baseUrl}/trade/market/${symbol}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch market: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.data : null;
  }

  /**
   * Get trade preview
   */
  async getTradePreview(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    type: 'market' | 'limit' = 'market',
    price?: number,
    leverage: number = 1
  ): Promise<TradePreview> {
    const response = await fetch(`${this.baseUrl}/trade/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        side,
        size,
        type,
        price,
        leverage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get trade preview: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get trade preview');
    }
    return data.data;
  }

  /**
   * Execute trade and wait for commitment
   */
  async executeTrade(trade: TradeRequest): Promise<TradeResult> {
    if (!this.token) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const response = await fetch(`${this.baseUrl}/trade/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(trade),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to execute trade: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Trade execution failed');
    }
    
    return data.data;
  }

  /**
   * Get supported chains for bridging
   */
  async getBridgeChains(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/bridge/chains`);

    if (!response.ok) {
      throw new Error(`Failed to fetch chains: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.data : [];
  }

  /**
   * Get bridge preview
   */
  async getBridgePreview(
    sourceChain: string,
    destinationChain: string,
    amount: string
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/bridge/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceChain,
        destinationChain,
        amount,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get bridge preview: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.data : null;
  }
}

// Export singleton instance
export const backendAPI = new BackendAPIClient();
export default backendAPI;
