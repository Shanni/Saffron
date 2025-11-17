/**
 * OKX 钱包服务 - 统一管理 Base 和 Aptos 两条链
 * 一个钱包，两条链！
 */

import { ethers } from 'ethers';

// OKX 钱包状态
export interface OKXWalletState {
  isInstalled: boolean;
  isConnected: boolean;
  baseAddress: string;
  aptosAddress: string;
}

/**
 * OKX 钱包服务类
 * 同时管理 EVM (Base) 和 Aptos 连接
 */
export class OKXWalletService {
  private listeners: ((state: OKXWalletState) => void)[] = [];
  private currentState: OKXWalletState = {
    isInstalled: false,
    isConnected: false,
    baseAddress: '',
    aptosAddress: '',
  };

  constructor() {
    this.checkInstallation();
  }

  /**
   * 检查 OKX 钱包是否已安装
   */
  checkInstallation(): boolean {
    if (typeof window === 'undefined') return false;
    
    const hasOKX = !!(window as any).okxwallet;
    this.currentState.isInstalled = hasOKX;
    
    console.log('🦊 OKX 钱包检查:', hasOKX ? '已安装' : '未安装');
    return hasOKX;
  }

  /**
   * 连接 OKX 钱包（同时连接 Base 和 Aptos）
   */
  async connect(): Promise<OKXWalletState> {
    if (!this.checkInstallation()) {
      throw new Error('请先安装 OKX 钱包: https://www.okx.com/web3');
    }

    const okx = (window as any).okxwallet;

    try {
      console.log('🔗 正在连接 OKX 钱包...');

      // 1. 连接 Base 链 (EVM)
      console.log('📍 连接 Base 链...');
      const baseAccounts = await okx.request({
        method: 'eth_requestAccounts',
      });
      this.currentState.baseAddress = baseAccounts[0];
      console.log('✅ Base 地址:', this.currentState.baseAddress);

      // 2. 切换到 Base Sepolia 测试网
      try {
        await okx.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14a34' }], // Base Sepolia = 84532
        });
      } catch (switchError: any) {
        // 如果链不存在，添加它
        if (switchError.code === 4902) {
          await okx.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x14a34',
                chainName: 'Base Sepolia',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              },
            ],
          });
        }
      }

      // 3. 连接 Aptos 链
      console.log('📍 连接 Aptos 链...');
      
      // OKX 的 Aptos 支持
      const aptosProvider = okx.aptos;
      if (!aptosProvider) {
        console.warn('⚠️ OKX 钱包未启用 Aptos 支持');
        throw new Error('请在 OKX 钱包中启用 Aptos 链');
      }

      const aptosAccount = await aptosProvider.connect();
      this.currentState.aptosAddress = aptosAccount.address;
      console.log('✅ Aptos 地址:', this.currentState.aptosAddress);

      // 4. 检查 Aptos 网络
      const network = await aptosProvider.network();
      console.log('📡 Aptos 网络:', network);
      
      if (network !== 'Testnet') {
        console.warn('⚠️ 当前不在 Aptos Testnet');
        
        // 提示用户手动切换
        const message = `⚠️ Aptos 网络错误\n\n当前: ${network}\n需要: Testnet\n\n请在 OKX 钱包中手动切换：\n1. 打开 OKX 钱包\n2. 点击右上角网络切换\n3. 选择 Aptos → Testnet`;
        
        alert(message);
        throw new Error('Aptos 网络必须是 Testnet');
      }

      // 5. 更新状态
      this.currentState.isConnected = true;
      this.notifyListeners();

      console.log('🎉 OKX 钱包连接成功！');
      return this.currentState;
    } catch (error: any) {
      console.error('❌ OKX 钱包连接失败:', error);
      throw new Error(`连接失败: ${error.message}`);
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.currentState.isConnected = false;
    this.currentState.baseAddress = '';
    this.currentState.aptosAddress = '';
    this.notifyListeners();
    console.log('👋 OKX 钱包已断开');
  }

  /**
   * 获取当前状态
   */
  getState(): OKXWalletState {
    return { ...this.currentState };
  }

  /**
   * 监听状态变化
   */
  subscribe(listener: (state: OKXWalletState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 通知所有监听者
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  /**
   * 获取 Base 链的 ethers Provider
   */
  getBaseProvider(): ethers.BrowserProvider {
    if (!this.currentState.isConnected) {
      throw new Error('请先连接 OKX 钱包');
    }
    const okx = (window as any).okxwallet;
    return new ethers.BrowserProvider(okx);
  }

  /**
   * 获取 Base 链的 Signer
   */
  async getBaseSigner(): Promise<ethers.Signer> {
    const provider = this.getBaseProvider();
    return await provider.getSigner();
  }

  /**
   * 获取 Aptos Provider
   */
  getAptosProvider(): any {
    if (!this.currentState.isConnected) {
      throw new Error('请先连接 OKX 钱包');
    }
    const okx = (window as any).okxwallet;
    if (!okx.aptos) {
      throw new Error('OKX 钱包未启用 Aptos 支持');
    }
    return okx.aptos;
  }
}

// 导出单例实例
export const okxWallet = new OKXWalletService();

