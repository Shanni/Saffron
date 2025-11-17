/**
 * 钱包集成服务 - 支持 MetaMask (Base) 和 Petra (Aptos)
 * 完全前端实现，不需要后端
 */

import { ethers } from 'ethers';

// ==================== MetaMask (Base Chain) ====================

export interface MetaMaskWallet {
  address: string;
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  chainId: number;
}

export class MetaMaskService {
  private static instance: MetaMaskService;

  private constructor() {}

  static getInstance(): MetaMaskService {
    if (!MetaMaskService.instance) {
      MetaMaskService.instance = new MetaMaskService();
    }
    return MetaMaskService.instance;
  }

  /**
   * 检查是否安装了 MetaMask
   */
  isInstalled(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
  }

  /**
   * 连接 MetaMask 钱包
   */
  async connect(): Promise<MetaMaskWallet> {
    if (!this.isInstalled()) {
      throw new Error('请先安装 MetaMask 钱包');
    }

    try {
      const ethereum = (window as any).ethereum;
      
      // 请求连接钱包
      await ethereum.request({ method: 'eth_requestAccounts' });

      // 创建 provider 和 signer
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      return {
        address,
        provider,
        signer,
        chainId: Number(network.chainId),
      };
    } catch (error) {
      console.error('MetaMask 连接失败:', error);
      throw new Error('连接 MetaMask 失败');
    }
  }

  /**
   * 切换到 Base Sepolia 测试网
   */
  async switchToBaseSepolia(): Promise<void> {
    const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // 84532 in hex
    const ethereum = (window as any).ethereum;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // 如果链不存在，添加它
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: BASE_SEPOLIA_CHAIN_ID,
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
      } else {
        throw switchError;
      }
    }
  }

  /**
   * 监听账户变化
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.isInstalled()) {
      const ethereum = (window as any).ethereum;
      ethereum.on('accountsChanged', callback);
    }
  }

  /**
   * 监听网络变化
   */
  onChainChanged(callback: (chainId: string) => void): void {
    if (this.isInstalled()) {
      const ethereum = (window as any).ethereum;
      ethereum.on('chainChanged', callback);
    }
  }

  /**
   * 获取当前连接的账户
   */
  async getCurrentAccount(): Promise<string | null> {
    if (!this.isInstalled()) {
      return null;
    }

    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('获取账户失败:', error);
      return null;
    }
  }
}

// ==================== Petra (Aptos Chain) ====================

export interface PetraWallet {
  address: string;
  publicKey: string;
  network: string;
}

export class PetraService {
  private static instance: PetraService;

  private constructor() {}

  static getInstance(): PetraService {
    if (!PetraService.instance) {
      PetraService.instance = new PetraService();
    }
    return PetraService.instance;
  }

  /**
   * 检查是否安装了 Petra 钱包
   */
  isInstalled(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).aptos !== 'undefined';
  }

  /**
   * 连接 Petra 钱包
   */
  async connect(): Promise<PetraWallet> {
    if (!this.isInstalled()) {
      throw new Error('请先安装 Petra 钱包');
    }

    try {
      const petra = (window as any).aptos;

      // 请求连接钱包
      const response = await petra.connect();

      return {
        address: response.address,
        publicKey: response.publicKey,
        network: petra.network || 'testnet',
      };
    } catch (error) {
      console.error('Petra 连接失败:', error);
      throw new Error('连接 Petra 钱包失败');
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (!this.isInstalled()) {
      return;
    }

    try {
      const petra = (window as any).aptos;
      await petra.disconnect();
    } catch (error) {
      console.error('Petra 断开连接失败:', error);
    }
  }

  /**
   * 签名并发送交易
   */
  async signAndSubmitTransaction(transaction: any): Promise<{ hash: string }> {
    if (!this.isInstalled()) {
      throw new Error('Petra 钱包未安装');
    }

    try {
      const petra = (window as any).aptos;
      const response = await petra.signAndSubmitTransaction(transaction);
      return { hash: response.hash };
    } catch (error) {
      console.error('交易签名失败:', error);
      throw new Error('交易签名失败');
    }
  }

  /**
   * 获取账户信息
   */
  async getAccount(): Promise<PetraWallet | null> {
    if (!this.isInstalled()) {
      return null;
    }

    try {
      const petra = (window as any).aptos;
      const account = await petra.account();
      
      return {
        address: account.address,
        publicKey: account.publicKey,
        network: petra.network || 'testnet',
      };
    } catch (error) {
      console.error('获取账户失败:', error);
      return null;
    }
  }

  /**
   * 切换到 Aptos 测试网
   * 注意：Petra 钱包需要用户手动在钱包中切换网络
   */
  async switchToTestnet(): Promise<void> {
    if (!this.isInstalled()) {
      throw new Error('Petra 钱包未安装');
    }

    try {
      const petra = (window as any).aptos;
      
      // 检查当前网络
      if (petra.network && petra.network.name) {
        console.log('当前 Petra 网络:', petra.network.name);
        
        // 如果不是测试网，提示用户手动切换
        if (petra.network.name.toLowerCase() !== 'testnet') {
          console.warn('请在 Petra 钱包中手动切换到测试网');
        }
      }
      
      // Petra 不支持程序化切换网络，需要用户手动操作
      // 这里只做检查，不抛出错误
    } catch (error) {
      console.error('检查网络失败:', error);
      // 不抛出错误，允许继续
    }
  }

  /**
   * 监听账户变化
   */
  onAccountChanged(callback: (account: any) => void): void {
    if (this.isInstalled()) {
      const petra = (window as any).aptos;
      petra.onAccountChange(callback);
    }
  }

  /**
   * 监听网络变化
   */
  onNetworkChanged(callback: (network: any) => void): void {
    if (this.isInstalled()) {
      const petra = (window as any).aptos;
      petra.onNetworkChange(callback);
    }
  }
}

// ==================== 钱包管理器 ====================

export interface WalletState {
  metamask: {
    connected: boolean;
    address: string | null;
    chainId: number | null;
  };
  petra: {
    connected: boolean;
    address: string | null;
    network: string | null;
  };
}

export class WalletManager {
  private static instance: WalletManager;
  private metaMask: MetaMaskService;
  private petra: PetraService;
  private state: WalletState;
  private listeners: ((state: WalletState) => void)[] = [];

  private constructor() {
    this.metaMask = MetaMaskService.getInstance();
    this.petra = PetraService.getInstance();
    this.state = {
      metamask: { connected: false, address: null, chainId: null },
      petra: { connected: false, address: null, network: null },
    };

    this.setupListeners();
  }

  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  private setupListeners(): void {
    // 监听 MetaMask 账户变化
    this.metaMask.onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        this.state.metamask = { connected: false, address: null, chainId: null };
      } else {
        this.state.metamask.address = accounts[0];
      }
      this.notifyListeners();
    });

    // 监听 MetaMask 网络变化
    this.metaMask.onChainChanged((chainId) => {
      this.state.metamask.chainId = parseInt(chainId, 16);
      this.notifyListeners();
    });

    // 监听 Petra 账户变化
    this.petra.onAccountChanged((account) => {
      if (account) {
        this.state.petra = {
          connected: true,
          address: account.address,
          network: account.network || 'testnet',
        };
      } else {
        this.state.petra = { connected: false, address: null, network: null };
      }
      this.notifyListeners();
    });
  }

  async connectMetaMask(): Promise<MetaMaskWallet> {
    const wallet = await this.metaMask.connect();
    await this.metaMask.switchToBaseSepolia();
    
    this.state.metamask = {
      connected: true,
      address: wallet.address,
      chainId: wallet.chainId,
    };
    this.notifyListeners();

    return wallet;
  }

  async connectPetra(): Promise<PetraWallet> {
    const wallet = await this.petra.connect();
    
    // 检查网络（不会因为网络问题而失败）
    try {
      await this.petra.switchToTestnet();
    } catch (error) {
      console.warn('网络检查失败，继续连接:', error);
    }
    
    this.state.petra = {
      connected: true,
      address: wallet.address,
      network: wallet.network,
    };
    this.notifyListeners();

    return wallet;
  }

  getState(): WalletState {
    return { ...this.state };
  }

  subscribe(listener: (state: WalletState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  isMetaMaskInstalled(): boolean {
    return this.metaMask.isInstalled();
  }

  isPetraInstalled(): boolean {
    return this.petra.isInstalled();
  }

  getMetaMaskService(): MetaMaskService {
    return this.metaMask;
  }

  getPetraService(): PetraService {
    return this.petra;
  }
}

// 导出单例
export const walletManager = WalletManager.getInstance();

