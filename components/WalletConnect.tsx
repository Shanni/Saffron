// Wallet Connection Component for Saffron
// Supports Phantom and Backpack wallets

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { walletService, WalletInfo } from '@/services/walletService';
import { driftService } from '@/services/driftService';

export default function WalletConnect() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    // Check if wallet is already connected
    const existingWallet = walletService.getWallet();
    if (existingWallet) {
      setWallet(existingWallet);
      loadBalance();
    }
  }, []);

  const loadBalance = async () => {
    try {
      const publicKey = walletService.getPublicKey();
      if (!publicKey) return;

      // Get SOL balance (you can add this method to walletService)
      // const balance = await connection.getBalance(publicKey);
      // setBalance(balance / 1e9);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const handleConnectPhantom = async () => {
    setConnecting(true);
    try {
      const walletInfo = await walletService.connectPhantom();
      setWallet(walletInfo);

      // Initialize Drift with wallet
      const driftWallet = walletService.getDriftWalletAdapter();
      await driftService.initialize(driftWallet);

      Alert.alert('Success', 'Phantom wallet connected!');
      await loadBalance();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect Phantom');
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectBackpack = async () => {
    setConnecting(true);
    try {
      const walletInfo = await walletService.connectBackpack();
      setWallet(walletInfo);

      // Initialize Drift with wallet
      const driftWallet = walletService.getDriftWalletAdapter();
      await driftService.initialize(driftWallet);

      Alert.alert('Success', 'Backpack wallet connected!');
      await loadBalance();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect Backpack');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await driftService.disconnect();
      await walletService.disconnect();
      setWallet(null);
      setBalance(null);
      Alert.alert('Success', 'Wallet disconnected');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to disconnect');
    }
  };

  if (wallet && wallet.connected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectedContainer}>
          <View style={styles.walletInfo}>
            <Text style={styles.walletType}>{wallet.type.toUpperCase()}</Text>
            <Text style={styles.walletAddress}>
              {wallet.publicKey.toString().slice(0, 4)}...
              {wallet.publicKey.toString().slice(-4)}
            </Text>
            {balance !== null && (
              <Text style={styles.balance}>{balance.toFixed(4)} SOL</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
          >
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect Wallet</Text>
      <Text style={styles.subtitle}>
        Connect your Solana wallet to start trading
      </Text>

      <TouchableOpacity
        style={[styles.button, styles.phantomButton]}
        onPress={handleConnectPhantom}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.buttonText}>🟣 Phantom</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.backpackButton]}
        onPress={handleConnectBackpack}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.buttonText}>🎒 Backpack</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        Make sure you have Phantom or Backpack wallet installed on your device
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  phantomButton: {
    backgroundColor: '#AB9FF2',
  },
  backpackButton: {
    backgroundColor: '#E33E3F',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  connectedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F4A261',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  balance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a9d8f',
  },
  disconnectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f44336',
    borderRadius: 6,
  },
  disconnectText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
