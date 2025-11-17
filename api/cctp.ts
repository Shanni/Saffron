/**
 * CCTP (Cross-Chain Transfer Protocol) integration for USDC bridging
 * 完全前端实现，使用 MetaMask（Base）+ Petra（Aptos）
 * Documentation: https://developers.circle.com/cctp
 */

import { BaseCCTPSender, CrossChainResult } from '../services/base-cctp-sender';
import { CircleAttestationService, AttestationData } from '../services/circle-attestation';
import { AptosCCTPReceiver, AptosReceiveResult } from '../services/aptos-cctp-receiver';
import { walletManager, WalletState } from '../services/wallets';
import { ethers } from 'ethers';

export interface CCTPChain {
  id: number;
  name: string;
  displayName: string;
  rpcUrl: string;
  explorerUrl: string;
  usdcAddress: string;
  tokenMessengerAddress: string;
  messageTransmitterAddress: string;
  estimatedFinality: number; // minutes
}

export interface CCTPTransferRequest {
  amount: string; // USDC amount (e.g., "10.5")
  destinationDomain: number;
  recipient: string; // destination address
  burnTxHash?: string;
}

export interface CCTPTransferResponse {
  attestation: string;
  messageHash: string;
  messageBody: string;
  estimatedTime: number; // seconds
  fees: {
    sourceFee: string;
    destinationFee: string;
    bridgeFee?: string;
  };
}

export interface CCTPTransferStatus {
  status: 'pending' | 'attested' | 'completed' | 'failed';
  txHash?: string;
  attestation?: string;
  estimatedCompletion?: number; // timestamp
  currentStep?: string;
  error?: string;
}

// 完整跨链流程参数
export interface FullCrossChainParams {
  amount: string; // USDC 数量（如 "10.5"）
  recipientAddress: string; // Aptos 接收地址
  onProgress?: (status: CCTPTransferStatus) => void; // 进度回调
}

// 完整跨链流程结果
export interface FullCrossChainResult {
  success: boolean;
  baseTransaction?: CrossChainResult;
  attestation?: AttestationData;
  aptosTransaction?: AptosReceiveResult;
  error?: string;
}

// Supported CCTP chains
export const CCTP_CHAINS: Record<string, CCTPChain> = {
  ethereum: {
    id: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://etherscan.io',
    usdcAddress: '0xA0b86a33E6441b8e5c7F6b8e4e4e4e4e4e4e4e4e',
    tokenMessengerAddress: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
    messageTransmitterAddress: '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81',
    estimatedFinality: 15,
  },
  arbitrum: {
    id: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://arbiscan.io',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    tokenMessengerAddress: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    messageTransmitterAddress: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    estimatedFinality: 15,
  },
  base: {
    id: 8453,
    name: 'base',
    displayName: 'Base',
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://basescan.org',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    tokenMessengerAddress: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
    messageTransmitterAddress: '0xAD09780d193884d503182aD4588450C416D6F9D4',
    estimatedFinality: 2,
  },
  optimism: {
    id: 10,
    name: 'optimism',
    displayName: 'Optimism',
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://optimistic.etherscan.io',
    usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    tokenMessengerAddress: '0x2B4069517957735bE00ceE0fadAE88a26365528f',
    messageTransmitterAddress: '0x4d41f22c5a0e5c74090899E5a8Fb597a8842b3e8',
    estimatedFinality: 15,
  },
  polygon: {
    id: 137,
    name: 'polygon',
    displayName: 'Polygon',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://polygonscan.com',
    usdcAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    tokenMessengerAddress: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
    messageTransmitterAddress: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
    estimatedFinality: 5,
  },
  avalanche: {
    id: 43114,
    name: 'avalanche',
    displayName: 'Avalanche',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    tokenMessengerAddress: '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982',
    messageTransmitterAddress: '0x8186359aF5F57FbB40c6b14A588d2A59C0C29880',
    estimatedFinality: 2,
  },
  aptos: {
    id: 1,
    name: 'aptos',
    displayName: 'Aptos',
    rpcUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
    explorerUrl: 'https://explorer.aptoslabs.com',
    usdcAddress: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    tokenMessengerAddress: '0x1::cctp::TokenMessenger',
    messageTransmitterAddress: '0x1::cctp::MessageTransmitter',
    estimatedFinality: 1,
  },
};

export class CCTPAPI {
  private baseSender: BaseCCTPSender;
  private attestationService: CircleAttestationService;
  private aptosReceiver: AptosCCTPReceiver;

  constructor() {
    this.baseSender = new BaseCCTPSender();
    this.attestationService = new CircleAttestationService();
    this.aptosReceiver = new AptosCCTPReceiver();
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): CCTPChain[] {
    return Object.values(CCTP_CHAINS);
  }

  /**
   * Get chain by name
   */
  getChain(chainName: string): CCTPChain | null {
    const normalizedName = chainName.toLowerCase();
    return CCTP_CHAINS[normalizedName] || null;
  }

  /**
   * 获取钱包管理器
   */
  getWalletManager() {
    return walletManager;
  }

  /**
   * 检查钱包连接状态
   */
  getWalletState(): WalletState {
    return walletManager.getState();
  }

  /**
   * 连接 MetaMask（Base 链）
   */
  async connectMetaMask() {
    return await walletManager.connectMetaMask();
  }

  /**
   * 连接 Petra（Aptos 链）
   */
  async connectPetra() {
    return await walletManager.connectPetra();
  }

  /**
   * 检查 Base 链 USDC 余额
   */
  async checkBaseUSDCBalance(address: string): Promise<string> {
    return await this.baseSender.checkUSDCBalance(address);
  }

  /**
   * 检查 Aptos 链 USDC 余额
   */
  async checkAptosUSDCBalance(address: string): Promise<string> {
    return await this.aptosReceiver.checkUSDCBalance(address);
  }

  /**
   * 执行完整的 Base -> Aptos CCTP 跨链流程
   * 这是核心函数，完全在前端执行，不需要后端！
   */
  async executeFullCrossChain(params: FullCrossChainParams): Promise<FullCrossChainResult> {
    const result: FullCrossChainResult = {
      success: false,
    };

    try {
      // Update status: Initialize
      params.onProgress?.({
        status: 'pending',
        currentStep: '🚀 Initializing',
      });

      // Check wallet connections
      const walletState = walletManager.getState();
      if (!walletState.metamask.connected) {
        throw new Error('Please connect MetaMask wallet first');
      }
      if (!walletState.petra.connected) {
        throw new Error('Please connect Petra wallet first');
      }

      // Step 1: Burn USDC on Base chain
      params.onProgress?.({
        status: 'pending',
        currentStep: '💳 Step 1/3: Base',
      });

      // Use MetaMask Base chain provider
      const metaMaskService = walletManager.getMetaMaskService();
      const metaMaskWallet = await metaMaskService.connect();
      const baseSigner = metaMaskWallet.signer;
      
      const baseResult = await this.baseSender.executeFullCrossChain({
        amount: params.amount,
        recipientAddress: params.recipientAddress,
        signer: baseSigner,
        onProgress: (step) => {
          params.onProgress?.({
            status: 'pending',
            currentStep: step,
          });
        },
      });

      result.baseTransaction = baseResult;

      // Step 2: Get Circle attestation
      params.onProgress?.({
        status: 'pending',
        currentStep: '🔐 Step 2/3: Circle',
      });

      const attestation = await this.attestationService.getAttestation(
        baseResult.messageHash,
        (step) => {
          params.onProgress?.({
            status: 'pending',
            currentStep: step,
          });
        }
      );

      result.attestation = attestation;

      // Step 3: Receive USDC on Aptos chain
      params.onProgress?.({
        status: 'attested',
        currentStep: '🎁 Step 3/3: Aptos',
      });

      const aptosResult = await this.aptosReceiver.receiveCCTPUSDC({
        messageBytes: attestation.messageBytes || baseResult.messageBytes,
        attestation: attestation.attestation,
        amount: params.amount,
        onProgress: (step) => {
          params.onProgress?.({
            status: 'attested',
            currentStep: step,
          });
        },
      });

      result.aptosTransaction = aptosResult;

      if (aptosResult.success) {
        result.success = true;
        params.onProgress?.({
          status: 'completed',
          currentStep: `🎉 Complete! Received ${aptosResult.usdcAmount} USDC`,
          txHash: aptosResult.txHash,
        });
      } else {
        throw new Error(aptosResult.error || 'Aptos receive failed');
      }

      return result;
    } catch (error: any) {
      console.error('Cross-chain process failed:', error);
      result.success = false;
      result.error = error.message || 'Cross-chain transfer failed';

      params.onProgress?.({
        status: 'failed',
        currentStep: `❌ ${result.error}`,
        error: result.error,
      });

      return result;
    }
  }

  /**
   * Estimate transfer time and fees
   */
  async estimateTransfer(
    sourceChain: string,
    destinationChain: string,
    amount: string
  ): Promise<{
    estimatedTime: number;
    fees: {
      sourceFee: string;
      destinationFee: string;
      bridgeFee?: string;
    };
  }> {
    const source = this.getChain(sourceChain);
    const destination = this.getChain(destinationChain);

    if (!source || !destination) {
      throw new Error('Unsupported chain');
    }

    // Base -> Aptos estimated time: 2-5 minutes
    const estimatedTime = 180; // 3 minutes (in seconds)

    // Fee estimation (actual fees depend on network status)
    const fees = {
      sourceFee: '0.001', // Base chain gas fee (ETH)
      destinationFee: '0.0005', // Aptos chain gas fee (APT)
      bridgeFee: '0', // CCTP protocol has no bridge fee
    };

    return {
      estimatedTime,
      fees,
    };
  }

  /**
   * Validate transfer parameters
   */
  validateTransfer(
    sourceChain: string,
    destinationChain: string,
    amount: string,
    recipient: string
  ): { valid: boolean; error?: string } {
    // Currently only supports Base -> Aptos
    if (sourceChain.toLowerCase() !== 'base') {
      return { valid: false, error: 'Currently only supports transfers from Base chain' };
    }

    if (destinationChain.toLowerCase() !== 'aptos') {
      return { valid: false, error: 'Currently only supports transfers to Aptos chain' };
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }

    if (amountNum < 0.1) {
      return { valid: false, error: 'Minimum transfer amount is 0.1 USDC' };
    }

    // Validate Aptos address format
    if (!recipient || !recipient.startsWith('0x') || recipient.length !== 66) {
      return { valid: false, error: 'Invalid Aptos address format (should be 64-character hex address)' };
    }

    return { valid: true };
  }

  /**
   * 检查是否安装了所需钱包
   */
  checkWalletInstallation(): {
    metamask: boolean;
    petra: boolean;
  } {
    return {
      metamask: walletManager.isMetaMaskInstalled(),
      petra: walletManager.isPetraInstalled(),
    };
  }
}

export default CCTPAPI;
