// Jupiter DEX Aggregator Service for Saffron
// Provides real trading execution via Jupiter's smart routing

import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

// Token addresses on Solana mainnet
export const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
};

export interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot?: number;
  timeTaken?: number;
}

export interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

export interface JupiterSwapParams {
  inputMint: string;
  outputMint: string;
  amount: number; // in base units (lamports for SOL, smallest unit for tokens)
  slippageBps?: number; // basis points (50 = 0.5%)
  priorityFee?: 'auto' | number;
  onlyDirectRoutes?: boolean;
  maxAccounts?: number;
}

export interface SwapResult {
  success: boolean;
  signature?: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fee: number;
  error?: string;
}

class JupiterService {
  private connection: Connection;
  private rpcUrl: string;
  private apiUrl: string;

  constructor() {
    // Use environment variables or defaults
    this.rpcUrl = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.apiUrl = process.env.EXPO_PUBLIC_JUPITER_API_URL || 'https://public.jupiterapi.com';
    
    this.connection = new Connection(this.rpcUrl, 'confirmed');
  }

  /**
   * Get a quote for a swap
   */
  async getQuote(params: JupiterSwapParams): Promise<QuoteResponse> {
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps = 50,
      onlyDirectRoutes = false,
      maxAccounts = 64,
    } = params;

    try {
      const queryParams = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: onlyDirectRoutes.toString(),
        maxAccounts: maxAccounts.toString(),
        swapMode: 'ExactIn',
        restrictIntermediateTokens: 'true',
      });

      const response = await fetch(`${this.apiUrl}/quote?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }

      const quote: QuoteResponse = await response.json();
      return quote;
    } catch (error) {
      console.error('Error getting Jupiter quote:', error);
      throw error;
    }
  }

  /**
   * Execute a swap
   */
  async executeSwap(
    wallet: any,
    params: JupiterSwapParams
  ): Promise<SwapResult> {
    try {
      // 1. Get quote
      const quote = await this.getQuote(params);

      console.log('Quote received:', {
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct,
        route: quote.routePlan.map(r => r.swapInfo.label).join(' → '),
      });

      // 2. Get swap transaction
      const swapResponse = await fetch(`${this.apiUrl}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toString(),
          prioritizationFeeLamports: params.priorityFee || 'auto',
          useSharedAccounts: true,
          dynamicComputeUnitLimit: true,
        }),
      });

      if (!swapResponse.ok) {
        throw new Error(`Swap API error: ${swapResponse.statusText}`);
      }

      const swapData: SwapResponse = await swapResponse.json();

      // 3. Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign transaction with wallet
      const signedTransaction = await wallet.signTransaction(transaction);

      // 4. Send transaction
      const rawTransaction = signedTransaction.serialize();
      const signature = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 3,
      });

      // 5. Confirm transaction
      const confirmation = await this.connection.confirmTransaction(
        signature,
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return {
        success: true,
        signature,
        inputAmount: parseInt(quote.inAmount),
        outputAmount: parseInt(quote.outAmount),
        priceImpact: parseFloat(quote.priceImpactPct),
        fee: swapData.prioritizationFeeLamports,
      };

    } catch (error: any) {
      console.error('Swap execution error:', error);
      return {
        success: false,
        inputAmount: params.amount,
        outputAmount: 0,
        priceImpact: 0,
        fee: 0,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get current price for a token pair
   */
  async getPrice(inputMint: string, outputMint: string, amount: number = 1_000_000): Promise<number> {
    try {
      const quote = await this.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps: 50,
      });

      const price = parseInt(quote.outAmount) / parseInt(quote.inAmount);
      return price;
    } catch (error) {
      console.error('Error getting price:', error);
      return 0;
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(walletAddress: string, tokenMint: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      
      if (tokenMint === TOKENS.SOL) {
        const balance = await this.connection.getBalance(publicKey);
        return balance;
      } else {
        // Get SPL token balance
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: new PublicKey(tokenMint) }
        );

        if (tokenAccounts.value.length === 0) return 0;

        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
        return parseInt(balance);
      }
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  /**
   * Estimate optimal slippage based on market conditions
   */
  async estimateSlippage(inputMint: string, outputMint: string, amount: number): Promise<number> {
    try {
      // Get quote to check price impact
      const quote = await this.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps: 50,
      });

      const priceImpact = parseFloat(quote.priceImpactPct);

      // Recommend slippage based on price impact
      if (priceImpact < 0.1) return 50; // 0.5% for low impact
      if (priceImpact < 0.5) return 100; // 1% for medium impact
      if (priceImpact < 2) return 300; // 3% for high impact
      return 500; // 5% for very high impact
    } catch (error) {
      console.error('Error estimating slippage:', error);
      return 100; // Default 1%
    }
  }

  /**
   * Get supported tokens
   */
  async getSupportedTokens(): Promise<Array<{ address: string; symbol: string; name: string; decimals: number }>> {
    try {
      const response = await fetch('https://token.jup.ag/strict');
      const tokens = await response.json();
      return tokens;
    } catch (error) {
      console.error('Error fetching supported tokens:', error);
      return [];
    }
  }

  /**
   * Convert human-readable amount to base units
   */
  toBaseUnits(amount: number, decimals: number): number {
    return Math.floor(amount * Math.pow(10, decimals));
  }

  /**
   * Convert base units to human-readable amount
   */
  fromBaseUnits(amount: number, decimals: number): number {
    return amount / Math.pow(10, decimals);
  }
}

// Export singleton instance
export const jupiterService = new JupiterService();
