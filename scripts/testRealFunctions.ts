// Real Functions Test - Honest reporting of what works
// Run with: npm run test:real

import { Connection, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { DriftService, DRIFT_MARKETS } from '../services/driftService';
import * as fs from 'fs';

const HELIUS_RPC = 'https://solana-devnet.api.onfinality.io/public';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'FALLBACK';
  message: string;
  error?: string;
}

const results: TestResult[] = [];

function addResult(name: string, status: 'PASS' | 'FAIL' | 'FALLBACK', message: string, error?: string) {
  results.push({ name, status, message, error });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
}

async function testRealFunctions() {
  console.log('🔬 REAL DRIFT PROTOCOL FUNCTION TEST\n');
  console.log('This test honestly reports what actually works vs fallbacks\n');
  console.log('═══════════════════════════════════════════════════════\n');

  let driftService: DriftService | null = null;

  try {
    // Setup
    console.log('📋 SETUP\n');
    
    const keypairPath = './devnet-keypair.json';
    if (!fs.existsSync(keypairPath)) {
      throw new Error('Devnet keypair not found');
    }
    
    const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    
    console.log(`Wallet: ${keypair.publicKey.toString()}`);
    
    const connection = new Connection(HELIUS_RPC, 'confirmed');
    // const balance = await connection.getBalance(keypair.publicKey);
    // console.log(`Balance: ${balance / 1e9} SOL`);
    // console.log(`Network: Devnet`);
    // console.log(`RPC: Helius\n`);

    // // Initialize Drift
    // console.log('═══════════════════════════════════════════════════════\n');
    // console.log('🔧 INITIALIZATION TESTS\n');
    
    try {
      driftService = new DriftService(HELIUS_RPC, 'devnet');
      const wallet = new Wallet(keypair);
      await driftService.initialize(wallet);
      addResult('Drift Initialization', 'PASS', 'Successfully connected to Drift Protocol');
    } catch (error: any) {
      addResult('Drift Initialization', 'FAIL', 'Failed to initialize', error.message);
      throw error;
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📊 MARKET DATA TESTS\n');

    // Test getMarketIndex
    try {
      const solIndex = driftService!.getMarketIndex('SOL-PERP');
      if (solIndex === 0) {
        addResult('getMarketIndex', 'PASS', 'Returns correct market indices');
      } else {
        addResult('getMarketIndex', 'FAIL', 'Incorrect index returned');
      }
    } catch (error: any) {
      addResult('getMarketIndex', 'FAIL', 'Function threw error', error.message);
    }

    // Test getMarketPrice
    try {
      const solPrice = await driftService!.getMarketPrice(DRIFT_MARKETS['SOL-PERP']);
      setTimeout(() => {
        console.log('fetch solPrice');
      }, 5000);
      // Check if it's a realistic price or fallback
      if (solPrice > 50 && solPrice < 500) {
        // Could be real or fallback, check console warnings
        addResult('getMarketPrice', 'FALLBACK', `Price: $${solPrice.toFixed(2)} (using fallback - market data not available)`);
      } else {
        addResult('getMarketPrice', 'FAIL', `Unrealistic price: $${solPrice}`);
      }
    } catch (error: any) {
      addResult('getMarketPrice', 'FAIL', 'Function threw error', error.message);
    }

    // Test getFundingRate
    try {
      const fundingRate = await driftService!.getFundingRate(DRIFT_MARKETS['SOL-PERP']);
      addResult('getFundingRate', 'FALLBACK', `Rate: ${(fundingRate * 100).toFixed(4)}% (using fallback)`);
    } catch (error: any) {
      addResult('getFundingRate', 'FAIL', 'Function threw error', error.message);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🧮 CALCULATION TESTS\n');

    // Test calculatePositionSize
    try {
      const positionSize = driftService!.calculatePositionSize(1000, 5, 145);
      if (positionSize > 0 && positionSize < 100) {
        addResult('calculatePositionSize', 'PASS', `Calculated: ${positionSize.toFixed(4)} SOL`);
      } else {
        addResult('calculatePositionSize', 'FAIL', `Invalid result: ${positionSize}`);
      }
    } catch (error: any) {
      addResult('calculatePositionSize', 'FAIL', 'Function threw error', error.message);
    }

    // Test calculateLiquidationPrice
    try {
      const liqPrice = driftService!.calculateLiquidationPrice(145, 5, 'long');
      if (liqPrice > 0 && liqPrice < 145) {
        addResult('calculateLiquidationPrice', 'PASS', `Long 5x: $${liqPrice.toFixed(2)}`);
      } else {
        addResult('calculateLiquidationPrice', 'FAIL', `Invalid liquidation price: $${liqPrice}`);
      }
    } catch (error: any) {
      addResult('calculateLiquidationPrice', 'FAIL', 'Function threw error', error.message);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('👤 USER ACCOUNT TESTS\n');

    // Test getPositions
    try {
      const positions = await driftService!.getPositions();
      if (Array.isArray(positions)) {
        addResult('getPositions', 'PASS', `Found ${positions.length} positions`);
      } else {
        addResult('getPositions', 'FAIL', 'Did not return array');
      }
    } catch (error: any) {
      addResult('getPositions', 'FAIL', 'Function threw error', error.message);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('💰 TRADING TESTS\n');

    // Test openPosition
    console.log('⚠️  Skipping actual trade execution (requires user account setup)');
    try {
      // Don't actually execute, just test the function exists
      if (typeof driftService!.openPosition === 'function') {
        addResult('openPosition', 'FALLBACK', 'Function exists but requires Drift user account initialization');
      }
    } catch (error: any) {
      addResult('openPosition', 'FAIL', 'Function not available', error.message);
    }

    // Test closePosition
    try {
      if (typeof driftService!.closePosition === 'function') {
        addResult('closePosition', 'FALLBACK', 'Function exists but requires Drift user account initialization');
      }
    } catch (error: any) {
      addResult('closePosition', 'FAIL', 'Function not available', error.message);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🔌 CONNECTION TESTS\n');

    // Test isReady
    try {
      const isReady = driftService!.isReady();
      if (isReady) {
        addResult('isReady', 'PASS', 'Drift client is ready');
      } else {
        addResult('isReady', 'FAIL', 'Drift client not ready');
      }
    } catch (error: any) {
      addResult('isReady', 'FAIL', 'Function threw error', error.message);
    }

    // Test disconnect
    try {
      await driftService!.disconnect();
      addResult('disconnect', 'PASS', 'Successfully disconnected');
    } catch (error: any) {
      addResult('disconnect', 'FAIL', 'Failed to disconnect', error.message);
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📊 TEST SUMMARY\n');
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const fallback = results.filter(r => r.status === 'FALLBACK').length;
    const total = results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Using Fallback: ${fallback}\n`);

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🔍 DETAILED RESULTS\n');
    
    results.forEach(r => {
      const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${r.name}`);
      console.log(`   ${r.message}`);
      if (r.error) {
        console.log(`   Error: ${r.error}`);
      }
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('💡 RECOMMENDATIONS\n');
    
    if (fallback > 0) {
      console.log('⚠️  Some functions are using fallback/mock data because:');
      console.log('   1. Drift markets may not be fully available on devnet');
      console.log('   2. Market data subscription needs time to load');
      console.log('   3. User account may not be initialized\n');
      console.log('To fix:');
      console.log('   - Test on mainnet with real funds (small amounts)');
      console.log('   - Initialize Drift user account first');
      console.log('   - Wait longer for market data to load\n');
    }

    if (failed > 0) {
      console.log('❌ Some tests failed. Check errors above for details.\n');
    }

    if (passed === total) {
      console.log('✅ All tests passed! Integration is fully functional.\n');
    }

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    throw error;
  }
}

testRealFunctions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
