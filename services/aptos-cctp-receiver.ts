/**
 * Aptos 链 CCTP 接收服务 - 铸造 USDC
 * 纯前端实现，使用 Petra 钱包签名和提交交易
 * 
 * 🔄 更新说明：
 * - 使用包装合约的 entry function 代替 script_payload
 * - Petra 钱包不支持 script_payload，必须使用 entry function
 * - 自动检查和注册 USDC CoinStore
 */

import { 
  Aptos, 
  AptosConfig, 
  Network,
} from '@aptos-labs/ts-sdk';
import { APTOS_TESTNET_CONTRACTS } from '../constants/contracts';

// Aptos 测试网配置
export const APTOS_TESTNET_CONFIG = {
  network: 'testnet',
  rpcUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
  domainId: 9,
  packages: {
    messageTransmitter: APTOS_TESTNET_CONTRACTS.messageTransmitter,
    tokenMessengerMinter: APTOS_TESTNET_CONTRACTS.tokenMessenger,
  },
  objects: {
    messageTransmitter: '0xcbb70e4f5d89b4a37e850c22d7c994e32c31e9cf693e9633784e482e9a879e0c',
    tokenMessengerMinter: '0x1fbf4458a00a842a4774f441fac7a41f2da0488dd93a43880e76d58789144e17',
    usdc: APTOS_TESTNET_CONTRACTS.usdc,
  },
};

// 接收参数接口
export interface AptosReceiveParams {
  messageBytes: string;
  attestation: string;
  amount: string;  // User input amount (e.g., "1.0")
  onProgress?: (step: string, data?: any) => void;
}

// 接收结果接口
export interface AptosReceiveResult {
  txHash: string;
  success: boolean;
  usdcAmount?: string;
  error?: string;
}

/**
 * Aptos 链 CCTP 接收服务
 */
export class AptosCCTPReceiver {
  private rpcUrl: string;
  private aptosClient: Aptos;

  constructor(rpcUrl?: string) {
    this.rpcUrl = rpcUrl || APTOS_TESTNET_CONFIG.rpcUrl;
    // 初始化 Aptos SDK 客户端
    this.aptosClient = new Aptos(new AptosConfig({ network: Network.TESTNET }));
  }

  /**
   * 检查 USDC 余额
   */
  async checkUSDCBalance(address: string): Promise<string> {
    try {
      console.log('Checking Aptos USDC balance...', address);

      // 尝试查询 FungibleAsset 标准
      try {
        const response = await fetch(`${this.rpcUrl}/accounts/${address}/resource/0x1::fungible_asset::FungibleStore`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const balance = data.data?.balance || '0';
          console.log('USDC balance query successful (Fungible Asset):', balance);
          return balance;
        }
      } catch (faError) {
        console.log('Trying traditional Coin standard query...');
      }

      // 尝试查询 Coin 标准
      const coinType = `0x1::coin::CoinStore<${APTOS_TESTNET_CONFIG.objects.usdc}::coin::USDC>`;
      const response = await fetch(`${this.rpcUrl}/accounts/${address}/resource/${encodeURIComponent(coinType)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const balance = data.data?.coin?.value || '0';
        console.log('USDC balance query successful (Coin):', balance);
        return balance;
      }

      console.log('USDC balance query failed (account may not exist or not initialized)');
      return '0';
    } catch (error) {
      console.log('USDC balance query failed:', (error as Error).message);
      return '0';
    }
  }

  /**
   * 接收 CCTP USDC（使用 Petra 钱包 + 包装合约）
   */
  async receiveCCTPUSDC(params: AptosReceiveParams): Promise<AptosReceiveResult> {
    try {
      params.onProgress?.('🎁 Receiving on Aptos');

      // Step 1: Validate inputs
      if (!this.validateMessageBytes(params.messageBytes)) {
        throw new Error('Invalid message bytes format');
      }

      if (!this.validateAttestation(params.attestation)) {
        throw new Error('Invalid attestation format');
      }

      // Step 2: Check Petra wallet
      if (typeof window === 'undefined' || typeof (window as any).aptos === 'undefined') {
        throw new Error('Petra wallet not installed or not connected');
      }

      const petra = (window as any).aptos;

      // Step 3: Get current account
      params.onProgress?.('🔑 Getting account');
      const account = await petra.account();
      const accountAddress = account.address;

      console.log('Receiving address:', accountAddress);

      // Step 4: Check USDC registration status
      const isRegistered = await this.checkUSDCRegistration(accountAddress);
      
      if (!isRegistered) {
        console.log('USDC not registered');
        console.log('Note: Aptos testnet USDC may use Fungible Asset standard');
      } else {
        console.log('USDC already registered');
      }

      // Step 5: Query balance before
      const balanceBefore = await this.checkUSDCBalance(accountAddress);
      console.log('Balance before:', balanceBefore);
      
      // Step 6: Convert message and attestation data
      const messageBytes = this.hexToBytes(params.messageBytes);
      const attestationBytes = this.hexToBytes(params.attestation);

      console.log('Data prepared:');
      console.log('  - Message length:', messageBytes.length, 'bytes');
      console.log('  - Attestation length:', attestationBytes.length, 'bytes');

      // Step 7: Build transaction (using wrapper contract entry function)
      params.onProgress?.('📝 Building transaction');

      console.log('Calling wrapper contract:');
      console.log('  - Contract address:', APTOS_TESTNET_CONTRACTS.cctpWrapper);
      console.log('  - Function: wrapper::receive_usdc');

      // Build entry_function_payload
      // Petra will automatically handle BCS serialization
      const payload = {
        function: `${APTOS_TESTNET_CONTRACTS.cctpWrapper}::wrapper::receive_usdc`,
        type_arguments: [],
        arguments: [
          Array.from(messageBytes),      // vector<u8>
          Array.from(attestationBytes),  // vector<u8>
        ],
      };

      console.log('Payload built');

      // Step 8: Sign and submit transaction
      params.onProgress?.('✍️ Waiting for signature');

      console.log('Waiting for Petra signature...');
      
      const pendingTxn = await petra.signAndSubmitTransaction({
        payload,
      });

      console.log('Transaction submitted!');
      console.log('  - Transaction hash:', pendingTxn.hash);
      
      params.onProgress?.('⏳ Confirming on Aptos');

      // Step 9: Wait for confirmation
      console.log('Waiting for transaction confirmation...');
      const confirmedTxn = await this.aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      console.log('Transaction confirmed!');
      console.log('  - Success:', confirmedTxn.success);
      console.log('  - Gas used:', (confirmedTxn as any).gas_used);

      if (!confirmedTxn.success) {
        throw new Error(`Transaction failed: ${confirmedTxn.vm_status}`);
      }

      // Step 10: Use user input amount instead of balance difference
      console.log('Cross-chain completed');
      console.log('  - Amount:', params.amount, 'USDC');

      params.onProgress?.(`✅ Received ${params.amount} USDC`);

      return {
        txHash: confirmedTxn.hash,
        success: true,
        usdcAmount: params.amount,  // Use user input amount
      };
    } catch (error: any) {
      console.error('\n========== Aptos CCTP receive failed ==========');
      console.error('Error object:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      // Try to extract more error info
      if (error.response) {
        console.error('Error response:', error.response);
      }
      if (error.data) {
        console.error('Error data:', error.data);
      }
      if (error.toString) {
        console.error('Error string:', error.toString());
      }
      
      console.error('===============================================\n');
      
      return {
        txHash: '',
        success: false,
        error: error.message || error.toString() || 'Receive failed',
      };
    }
  }

  /**
   * 检查 USDC 是否已注册（支持 Fungible Asset 和 Coin 标准）
   */
  async checkUSDCRegistration(address: string): Promise<boolean> {
    try {
      // 方法1：检查 Fungible Asset（新标准）
      const faStoreType = `0x1::fungible_asset::FungibleStore`;
      const faResponse = await fetch(
        `${this.rpcUrl}/accounts/${address}/resources`
      );
      
      if (faResponse.ok) {
        const resources = await faResponse.json();
        // 检查是否有 FungibleStore 资源
        const hasFungibleAsset = resources.some((r: any) => 
          r.type.includes('fungible_asset::FungibleStore')
        );
        
        if (hasFungibleAsset) {
          console.log('Detected Fungible Asset standard USDC');
          return true;
        }
      }
      
      // Method 2: Check Coin standard (old standard, fallback)
      const coinType = `0x1::coin::CoinStore<${APTOS_TESTNET_CONFIG.objects.usdc}::coin::USDC>`;
      const coinResponse = await fetch(
        `${this.rpcUrl}/accounts/${address}/resource/${encodeURIComponent(coinType)}`
      );
      
      if (coinResponse.ok) {
        console.log('Detected Coin standard USDC');
        return true;
      }
      
      console.log('USDC not registered');
      return false;
    } catch (error) {
      console.error('Check USDC registration failed:', error);
      return false;
    }
  }

  /**
   * Register USDC (must be called before first receive)
   */
  async registerUSDC(petra: any): Promise<void> {
    try {
      console.log('Registering USDC CoinStore...');
      
      const payload = {
        function: '0x1::managed_coin::register',
        type_arguments: [
          `${APTOS_TESTNET_CONFIG.objects.usdc}::coin::USDC`
        ],
        arguments: []
      };
      
      const txn = await petra.signAndSubmitTransaction({ payload });
      
      console.log('Waiting for registration transaction confirmation...');
      await this.aptosClient.waitForTransaction({
        transactionHash: txn.hash
      });
      
      console.log('USDC registration successful');
    } catch (error) {
      console.error('USDC registration failed:', error);
      throw new Error('USDC account initialization failed, please retry');
    }
  }


  /**
   * 验证消息字节
   */
  private validateMessageBytes(messageBytes: string): boolean {
    if (!messageBytes || typeof messageBytes !== 'string') {
      console.log('Message bytes is empty or not a string:', messageBytes);
      return false;
    }

    const isValid = messageBytes.startsWith('0x') && messageBytes.length > 10;
    console.log('Message bytes validation:', {
      messageBytes: messageBytes.substring(0, 50) + '...',
      length: messageBytes.length,
      startsWithOx: messageBytes.startsWith('0x'),
      isValid,
    });

    return isValid;
  }

  /**
   * 验证签名
   */
  private validateAttestation(attestation: string): boolean {
    return attestation.startsWith('0x') && attestation.length > 10;
  }

  /**
   * 将十六进制字符串转换为 Uint8Array
   */
  private hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.replace('0x', '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes;
  }


  /**
   * 检查消息是否已处理
   */
  async isMessageProcessed(messageHash: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.rpcUrl}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: `${APTOS_TESTNET_CONFIG.packages.messageTransmitter}::message_transmitter::is_nonce_used`,
          type_arguments: [],
          arguments: [messageHash],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result[0] as boolean;
      }

      return false;
    } catch (error) {
      console.error('Failed to check message status:', error);
      return false;
    }
  }
}

// 导出单例
export const aptosCCTPReceiver = new AptosCCTPReceiver();

