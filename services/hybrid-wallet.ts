/**
 * 混合钱包服务 - OKX (Base) + Petra (Aptos)
 * 最佳实践：使用各自钱包的优势
 */

import { ethers } from 'ethers';

// 混合钱包状态
export interface HybridWalletState {
  okxInstalled: boolean;
  petraInstalled: boolean;
  baseConnected: boolean;
  aptosConnected: boolean;
  baseAddress: string;
  aptosAddress: string;
}

/**
 * 混合钱包服务类
 * OKX 处理 Base，Petra 处理 Aptos
 */
export class HybridWalletService {
  private listeners: ((state: HybridWalletState) => void)[] = [];
  private currentState: HybridWalletState = {
    okxInstalled: false,
    petraInstalled: false,
    baseConnected: false,
    aptosConnected: false,
    baseAddress: '',
    aptosAddress: '',
  };

  constructor() {
    this.checkInstallation();
  }

  /**
   * 检查钱包安装状态
   */
  checkInstallation(): { okx: boolean; petra: boolean } {
    if (typeof window === 'undefined') {
      return { okx: false, petra: false };
    }
    
    const hasOKX = !!(window as any).okxwallet;
    const hasPetra = !!(window as any).aptos;
    
    this.currentState.okxInstalled = hasOKX;
    this.currentState.petraInstalled = hasPetra;
    
    console.log('🦊 OKX 钱包:', hasOKX ? '已安装' : '未安装');
    console.log('🪨 Petra 钱包:', hasPetra ? '已安装' : '未安装');
    
    return { okx: hasOKX, petra: hasPetra };
  }

  /**
   * 连接两个钱包
   */
  async connect(): Promise<HybridWalletState> {
    const installation = this.checkInstallation();

    if (!installation.okx) {
      throw new Error('请先安装 OKX 钱包: https://www.okx.com/web3');
    }

    if (!installation.petra) {
      throw new Error('请先安装 Petra 钱包: https://petra.app/');
    }

    try {
      console.log('🔗 开始连接钱包...');

      // 1. 连接 OKX (Base 链)
      await this.connectOKXBase();

      // 2. 连接 Petra (Aptos 链)
      await this.connectPetraAptos();

      console.log('🎉 两个钱包连接成功！');
      return this.currentState;
    } catch (error: any) {
      console.error('❌ 钱包连接失败:', error);
      throw error;
    }
  }

  /**
   * 连接 OKX 处理 Base 链
   */
  private async connectOKXBase(): Promise<void> {
    const okx = (window as any).okxwallet;

    console.log('📍 连接 OKX (Base 链)...');

    // 请求账户
    const accounts = await okx.request({
      method: 'eth_requestAccounts',
    });
    this.currentState.baseAddress = accounts[0];
    console.log('✅ Base 地址:', this.currentState.baseAddress);

    // 切换到 Base Sepolia
    try {
      await okx.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14a34' }], // Base Sepolia = 84532
      });
      console.log('✅ 已切换到 Base Sepolia');
    } catch (switchError: any) {
      // 如果链不存在，添加它
      if (switchError.code === 4902) {
        console.log('⚙️ 添加 Base Sepolia 网络...');
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
        console.log('✅ Base Sepolia 网络已添加');
      } else {
        throw switchError;
      }
    }

    this.currentState.baseConnected = true;
    this.notifyListeners();
  }

  /**
   * 连接 Petra 处理 Aptos 链
   */
  private async connectPetraAptos(): Promise<void> {
    const petra = (window as any).aptos;

    console.log('📍 连接 Petra (Aptos 链)...');

    // 连接 Petra
    const response = await petra.connect();
    this.currentState.aptosAddress = response.address;
    console.log('✅ Aptos 地址:', this.currentState.aptosAddress);

    // 检查网络
    const network = await petra.network();
    console.log('📡 Aptos 网络:', network);

    if (network !== 'Testnet') {
      console.warn('⚠️ 当前不在 Aptos Testnet');
      const message = `⚠️ Aptos 网络错误\n\n当前: ${network}\n需要: Testnet\n\n请在 Petra 钱包中手动切换到 Testnet，然后重新连接。`;
      alert(message);
      throw new Error('Aptos 网络必须是 Testnet');
    }

    this.currentState.aptosConnected = true;
    this.notifyListeners();
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.currentState.baseConnected = false;
    this.currentState.aptosConnected = false;
    this.currentState.baseAddress = '';
    this.currentState.aptosAddress = '';
    this.notifyListeners();
    console.log('👋 钱包已断开');
  }

  /**
   * 获取当前状态
   */
  getState(): HybridWalletState {
    return { ...this.currentState };
  }

  /**
   * 检查是否完全连接
   */
  isFullyConnected(): boolean {
    return this.currentState.baseConnected && this.currentState.aptosConnected;
  }

  /**
   * 监听状态变化
   */
  subscribe(listener: (state: HybridWalletState) => void): () => void {
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
   * 获取 OKX 的 Base Provider
   */
  getBaseProvider(): ethers.BrowserProvider {
    if (!this.currentState.baseConnected) {
      throw new Error('请先连接 OKX 钱包');
    }
    const okx = (window as any).okxwallet;
    return new ethers.BrowserProvider(okx);
  }

  /**
   * 获取 Base Signer
   */
  async getBaseSigner(): Promise<ethers.Signer> {
    const provider = this.getBaseProvider();
    return await provider.getSigner();
  }

  /**
   * 获取 Petra Aptos Provider
   */
  getAptosProvider(): any {
    if (!this.currentState.aptosConnected) {
      throw new Error('请先连接 Petra 钱包');
    }
    return (window as any).aptos;
  }
}

// 导出单例实例
export const hybridWallet = new HybridWalletService();

