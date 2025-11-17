/**
 * Base 链 CCTP 发送服务 - 燃烧 USDC
 * 纯前端实现，使用 OKX 钱包签名
 */

import { ethers } from 'ethers';

// Base Sepolia 测试网配置
export const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  rpcUrl: 'https://sepolia.base.org',
  domainId: 6,
  contracts: {
    tokenMessengerV2: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitterV2: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c',
    tokenMinterV2: '0xfd78EE919681417d192449715b2594ab58f5D002',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
};

// Aptos 域 ID
export const APTOS_DOMAIN_ID = 9;

// TokenMessenger ABI
const TOKEN_MESSENGER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint32', name: 'destinationDomain', type: 'uint32' },
      { internalType: 'bytes32', name: 'mintRecipient', type: 'bytes32' },
      { internalType: 'address', name: 'burnToken', type: 'address' },
    ],
    name: 'depositForBurn',
    outputs: [{ internalType: 'uint64', name: '_nonce', type: 'uint64' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// USDC ABI
const USDC_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// 地址转换工具
export function aptosAddressToBytes32(aptosAddress: string): string {
  const cleanAddress = aptosAddress.replace('0x', '');
  if (cleanAddress.length !== 64) {
    throw new Error('Invalid Aptos address length');
  }
  return '0x' + cleanAddress;
}

export function evmToAptosAddress(evmAddress: string): string {
  const cleanAddress = evmAddress.replace('0x', '');
  const paddedAddress = '0'.repeat(64 - cleanAddress.length) + cleanAddress;
  return '0x' + paddedAddress;
}

// 跨链参数接口
export interface CrossChainParams {
  amount: string; // USDC 数量（如 "10.5"）
  recipientAddress: string; // Aptos 接收地址
  signer: ethers.Signer; // MetaMask signer
  onProgress?: (step: string, data?: any) => void; // 进度回调
}

// 跨链结果接口
export interface CrossChainResult {
  txHash: string; // Base 链交易哈希
  nonce: string; // Nonce
  messageBytes: string; // 消息字节
  messageHash: string; // 消息哈希
}

/**
 * Base 链 CCTP 发送服务
 */
export class BaseCCTPSender {
  private provider: ethers.Provider;
  private tokenMessengerContract: ethers.Contract;
  private usdcContract: ethers.Contract;

  constructor(providerOrRpcUrl?: ethers.Provider | string) {
    // 如果提供了 provider，使用它；否则使用默认 RPC
    if (typeof providerOrRpcUrl === 'string' || !providerOrRpcUrl) {
      const rpcUrl = providerOrRpcUrl || BASE_SEPOLIA_CONFIG.rpcUrl;
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    } else {
      this.provider = providerOrRpcUrl;
    }

    this.tokenMessengerContract = new ethers.Contract(
      BASE_SEPOLIA_CONFIG.contracts.tokenMessengerV2,
      TOKEN_MESSENGER_ABI,
      this.provider
    );

    this.usdcContract = new ethers.Contract(
      BASE_SEPOLIA_CONFIG.contracts.usdc,
      USDC_ABI,
      this.provider
    );
  }

  /**
   * 检查 USDC 余额
   */
  async checkUSDCBalance(userAddress: string): Promise<string> {
    try {
      const balance = await this.usdcContract.balanceOf(userAddress);
      const decimals = await this.usdcContract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Failed to check USDC balance:', error);
      throw new Error('Failed to check USDC balance');
    }
  }

  /**
   * 授权 USDC 转账
   */
  async approveUSDC(params: {
    amount: string;
    signer: ethers.Signer;
    onProgress?: (step: string) => void;
  }): Promise<string> {
    try {
      params.onProgress?.('💳 Approving USDC');

      const usdcWithSigner = this.usdcContract.connect(params.signer) as any;
      const decimals = await this.usdcContract.decimals();
      const amountWei = ethers.parseUnits(params.amount, decimals);

      // Use MaxUint256 authorization to avoid multiple approvals
      const maxUint256 = ethers.MaxUint256;
      const approveTx = await usdcWithSigner.approve(
        BASE_SEPOLIA_CONFIG.contracts.tokenMessengerV2,
        maxUint256
      );

      params.onProgress?.('⏳ Confirming approval');
      await approveTx.wait();
      params.onProgress?.('✅ Approved');

      return approveTx.hash;
    } catch (error) {
      console.error('USDC approval failed:', error);
      throw new Error('USDC approval failed');
    }
  }

  /**
   * 燃烧 USDC（核心跨链函数）
   */
  async depositForBurn(params: CrossChainParams): Promise<CrossChainResult> {
    try {
      params.onProgress?.('🚀 Starting transfer');

      // Validate Aptos address format
      if (!params.recipientAddress.startsWith('0x') || params.recipientAddress.length !== 66) {
        throw new Error('Invalid Aptos address format, should be 64-character hexadecimal address');
      }

      const contractWithSigner = this.tokenMessengerContract.connect(params.signer) as any;
      const decimals = await this.usdcContract.decimals();
      const amountWei = ethers.parseUnits(params.amount, decimals);
      const mintRecipient = aptosAddressToBytes32(params.recipientAddress);

      params.onProgress?.('🔥 Burning USDC');

      const tx = await contractWithSigner.depositForBurn(
        amountWei,
        APTOS_DOMAIN_ID,
        mintRecipient,
        BASE_SEPOLIA_CONFIG.contracts.usdc
      );

      params.onProgress?.('⏳ Confirming on Base');
      const receipt = await tx.wait();
      const messageEvent = this.extractMessageFromReceipt(receipt);
      
      params.onProgress?.('✅ Base complete');

      return {
        txHash: tx.hash,
        nonce: messageEvent.nonce,
        messageBytes: messageEvent.messageBytes,
        messageHash: messageEvent.messageHash,
      };
    } catch (error: any) {
      console.error('Cross-chain transfer failed:', error);
      throw new Error(error.message || 'Cross-chain transfer failed');
    }
  }

  /**
   * 从交易回执中提取消息
   */
  private extractMessageFromReceipt(receipt: ethers.TransactionReceipt): {
    messageHash: string;
    messageBytes: string;
    nonce: string;
  } {
    try {
      const messageSentSignature = 'MessageSent(bytes)';
      const messageSentTopic = ethers.id(messageSentSignature);

      const messageSentLog = receipt.logs.find((log) => log.topics[0] === messageSentTopic);

      if (!messageSentLog) {
        throw new Error('MessageSent event not found. Please confirm the transaction successfully called depositForBurn');
      }

      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const decodedData = abiCoder.decode(['bytes'], messageSentLog.data);
      const messageBytes = decodedData[0] as string;

      if (!messageBytes.startsWith('0x')) {
        throw new Error('Message bytes format error, should be hexadecimal string');
      }

      const messageHash = ethers.keccak256(messageBytes);

      // 提取 nonce
      const depositForBurnSignature = 'DepositForBurn(uint64,address,uint256,address,bytes32,uint32,bytes32,bytes32)';
      const depositForBurnTopic = ethers.id(depositForBurnSignature);
      const depositLog = receipt.logs.find((log) => log.topics[0] === depositForBurnTopic);

      let nonce = '0';
      if (depositLog && depositLog.topics.length > 1) {
        nonce = depositLog.topics[1];
      }

      return {
        messageHash,
        messageBytes,
        nonce,
      };
    } catch (error) {
      console.error('Failed to extract cross-chain message:', error);
      throw error;
    }
  }

  /**
   * 执行完整跨链流程（包含余额检查和授权）
   */
  async executeFullCrossChain(params: CrossChainParams): Promise<CrossChainResult> {
    try {
      const userAddress = await params.signer.getAddress();

      // 1. Check balance
      params.onProgress?.('💰 Checking balance');
      const balance = await this.checkUSDCBalance(userAddress);

      if (parseFloat(balance) < parseFloat(params.amount)) {
        throw new Error(`Insufficient USDC balance, current: ${balance}, required: ${params.amount}`);
      }

      // 2. Approve USDC
      await this.approveUSDC({
        amount: params.amount,
        signer: params.signer,
        onProgress: params.onProgress,
      });

      // 3. Execute cross-chain transfer
      const result = await this.depositForBurn(params);

      return result;
    } catch (error: any) {
      console.error('Cross-chain transfer failed:', error);
      throw error;
    }
  }
}

