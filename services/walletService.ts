// Wallet Service for Saffron
// Supports Phantom and Backpack wallets on React Native

import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { toUint8Array } from 'js-base64';

export type WalletType = 'phantom' | 'backpack' | 'solflare';

export interface WalletInfo {
  publicKey: PublicKey;
  type: WalletType;
  connected: boolean;
  balance?: number;
}

class WalletService {
  private wallet: WalletInfo | null = null;
  private mobileWallet: Web3MobileWallet | null = null;

  /**
   * Connect to Phantom wallet
   */
  async connectPhantom(): Promise<WalletInfo> {
    try {
      console.log('Connecting to Phantom wallet...');

      // Use Mobile Wallet Adapter for React Native
      const authResult = await transact(async (wallet: Web3MobileWallet) => {
        const authorization = await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: {
            name: 'Saffron',
            uri: 'https://saffron.trade',
            icon: 'favicon.ico',
          },
        });

        return authorization;
      });

      const publicKey = new PublicKey(authResult.publicKey);

      this.wallet = {
        publicKey,
        type: 'phantom',
        connected: true,
      };

      this.mobileWallet = authResult.wallet as any;

      console.log('✅ Phantom connected:', publicKey.toString());

      return this.wallet;
    } catch (error) {
      console.error('❌ Failed to connect Phantom:', error);
      throw error;
    }
  }

  /**
   * Connect to Backpack wallet
   */
  async connectBackpack(): Promise<WalletInfo> {
    try {
      console.log('Connecting to Backpack wallet...');

      // Use Mobile Wallet Adapter for React Native
      const authResult = await transact(async (wallet: Web3MobileWallet) => {
        const authorization = await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: {
            name: 'Saffron',
            uri: 'https://saffron.trade',
            icon: 'favicon.ico',
          },
        });

        return authorization;
      });

      const publicKey = new PublicKey(authResult.publicKey);

      this.wallet = {
        publicKey,
        type: 'backpack',
        connected: true,
      };

      this.mobileWallet = authResult.wallet as any;

      console.log('✅ Backpack connected:', publicKey.toString());

      return this.wallet;
    } catch (error) {
      console.error('❌ Failed to connect Backpack:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (!this.wallet) return;

    try {
      if (this.mobileWallet) {
        await transact(async (wallet: Web3MobileWallet) => {
          await wallet.deauthorize();
        });
      }

      this.wallet = null;
      this.mobileWallet = null;

      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
      throw error;
    }
  }

  /**
   * Sign transaction
   */
  async signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
    if (!this.wallet || !this.mobileWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTransactions = await transact(async (wallet: Web3MobileWallet) => {
        const serialized = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        const signed = await wallet.signTransactions({
          transactions: [serialized],
        });

        return signed;
      });

      // Deserialize signed transaction
      if (transaction instanceof VersionedTransaction) {
        return VersionedTransaction.deserialize(signedTransactions[0]);
      } else {
        return Transaction.from(signedTransactions[0]);
      }
    } catch (error) {
      console.error('❌ Failed to sign transaction:', error);
      throw error;
    }
  }

  /**
   * Sign and send transaction
   */
  async signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<string> {
    if (!this.wallet || !this.mobileWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const signatures = await transact(async (wallet: Web3MobileWallet) => {
        const serialized = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        const result = await wallet.signAndSendTransactions({
          transactions: [serialized],
        });

        return result;
      });

      const signature = signatures[0];
      console.log('✅ Transaction sent:', signature);

      return signature;
    } catch (error) {
      console.error('❌ Failed to send transaction:', error);
      throw error;
    }
  }

  /**
   * Get wallet info
   */
  getWallet(): WalletInfo | null {
    return this.wallet;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.wallet !== null && this.wallet.connected;
  }

  /**
   * Get public key
   */
  getPublicKey(): PublicKey | null {
    return this.wallet?.publicKey || null;
  }

  /**
   * Get wallet type
   */
  getWalletType(): WalletType | null {
    return this.wallet?.type || null;
  }

  /**
   * Create wallet adapter for Drift
   */
  getDriftWalletAdapter(): any {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    return {
      publicKey: this.wallet.publicKey,
      signTransaction: this.signTransaction.bind(this),
      signAllTransactions: async (transactions: Transaction[]) => {
        return Promise.all(transactions.map(tx => this.signTransaction(tx)));
      },
    };
  }
}

// Export singleton instance
export const walletService = new WalletService();
