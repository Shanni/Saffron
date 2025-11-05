// Test Bot Execution Service (Frontend)
// Run with: npm run bot:frontend

import { Connection, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { botExecutionService } from '../services/botExecutionService';
import { driftService } from '../services/driftService';
import { coinGeckoService } from '../services/coinGeckoService';
import * as fs from 'fs';

const DEVNET_RPC = 'https://solana-devnet.api.onfinality.io/public';

async function testBotExecution() {
  console.log('🤖 FRONTEND BOT EXECUTION TEST\n');
  console.log('Using CoinGecko for real market data\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Load wallet
    const keypairPath = './devnet-keypair.json';
    if (!fs.existsSync(keypairPath)) {
      throw new Error('Devnet keypair not found');
    }
    
    const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const wallet = new Wallet(keypair);
    
    console.log('📋 SETUP');
    console.log(`Wallet: ${keypair.publicKey.toString()}`);
    console.log(`Network: Devnet`);
    console.log(`RPC: ${DEVNET_RPC}\n`);

    // Initialize Drift
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🔧 INITIALIZING DRIFT\n');
    
    await driftService.initialize(wallet);
    console.log('✅ Drift initialized\n');

    // Test CoinGecko
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 TESTING COINGECKO\n');
    
    const solPrice = await coinGeckoService.getPrice('SOL-PERP');
    console.log(`SOL Price: $${solPrice.toFixed(2)}`);
    
    const btcPrice = await coinGeckoService.getPrice('BTC-PERP');
    console.log(`BTC Price: $${btcPrice.toFixed(2)}`);
    
    const ethPrice = await coinGeckoService.getPrice('ETH-PERP');
    console.log(`ETH Price: $${ethPrice.toFixed(2)}\n`);

    // Add strategies
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 ADDING STRATEGIES\n');
    
    const dcaId = botExecutionService.addStrategy({
      name: 'SOL DCA',
      type: 'dca',
      market: 'SOL-PERP',
      enabled: true,
      triggerType: 'time',
      triggerInterval: 30, // 30 seconds for testing
      leverage: 1,
      positionSize: 10,
      stopLoss: 5,
      takeProfit: 10,
      dcaAmount: 10,
      dcaInterval: 30,
    });
    console.log(`   DCA Strategy: ${dcaId}`);

    const gridId = botExecutionService.addStrategy({
      name: 'SOL Grid',
      type: 'grid',
      market: 'SOL-PERP',
      enabled: true, // Enabled for testing
      triggerType: 'price',
      triggerPrice: solPrice,
      triggerCondition: 'above',
      leverage: 3,
      positionSize: 20,
      stopLoss: 3,
      takeProfit: 5,
      gridLevels: 10,
      gridSpacing: 1,
      gridMin: solPrice * 0.95,
      gridMax: solPrice * 1.05,
    });
    console.log(`   Grid Strategy: ${gridId}`);

    const momentumId = botExecutionService.addStrategy({
      name: 'SOL Momentum',
      type: 'momentum',
      market: 'SOL-PERP',
      enabled: true,
      triggerType: 'indicator',
      leverage: 5,
      positionSize: 50,
      stopLoss: 2,
      takeProfit: 8,
      momentumPeriod: 20,
      momentumThreshold: 2,
    });
    console.log(`   Momentum Strategy: ${momentumId}`);

    const reversionId = botExecutionService.addStrategy({
      name: 'SOL Mean Reversion',
      type: 'meanReversion',
      market: 'SOL-PERP',
      enabled: true,
      triggerType: 'indicator',
      leverage: 3,
      positionSize: 30,
      stopLoss: 3,
      takeProfit: 6,
      rsiPeriod: 14,
      rsiOversold: 30,
      rsiOverbought: 70,
    });
    console.log(`   Mean Reversion Strategy: ${reversionId}\n`);

    // Start CoinGecko auto-update
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🔄 STARTING COINGECKO AUTO-UPDATE\n');
    
    coinGeckoService.startAutoUpdate(['SOL-PERP', 'BTC-PERP', 'ETH-PERP']);

    // Start bot
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🚀 STARTING BOT\n');
    
    botExecutionService.start();

    // Show initial state
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 BOT STATE\n');
    
    const state = botExecutionService.getState();
    console.log(`Running: ${state.isRunning ? '✅ Yes' : '❌ No'}`);
    console.log(`Strategies: ${state.strategies.length}`);
    console.log(`Active: ${state.strategies.filter(s => s.enabled).length}\n`);

    // Show strategies
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 ACTIVE STRATEGIES\n');
    
    state.strategies.filter(s => s.enabled).forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.name}`);
      console.log(`   Type: ${s.type}`);
      console.log(`   Market: ${s.market}`);
      console.log(`   Leverage: ${s.leverage}x`);
      console.log(`   Position Size: $${s.positionSize}`);
      console.log(`   Trigger: ${s.triggerType}`);
      console.log(`   Status: ${s.status}`);
    });

    // Run for 2 minutes
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('⏱️  RUNNING BOT FOR 2 MINUTES...\n');
    console.log('Watch for:');
    console.log('  - Real-time price updates from CoinGecko');
    console.log('  - Strategy execution triggers');
    console.log('  - Trade executions on Drift\n');
    console.log('Press Ctrl+C to stop early\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Show updates every 15 seconds
    const updateInterval = setInterval(() => {
      const currentState = botExecutionService.getState();
      const prices = Array.from(currentState.priceData.entries());
      
      console.log('\n📊 UPDATE:');
      prices.forEach(([symbol, data]) => {
        console.log(`   ${symbol}: $${data.price.toFixed(2)} (${data.change24h > 0 ? '+' : ''}${data.change24h.toFixed(2)}%)`);
      });
      
      const executions = botExecutionService.getExecutionHistory(5);
      if (executions.length > 0) {
        console.log('\n   Recent Executions:');
        executions.forEach(e => {
          const icon = e.success ? '✅' : '❌';
          console.log(`   ${icon} ${e.strategyId.slice(0, 20)}... - ${e.direction} @ $${e.price.toFixed(2)}`);
        });
      }
    }, 15000);

    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes

    clearInterval(updateInterval);

    // Stop bot
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🛑 STOPPING BOT\n');
    
    coinGeckoService.stopAutoUpdate();
    botExecutionService.stop();

    // Final results
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📊 FINAL RESULTS\n');
    
    const finalState = botExecutionService.getState();
    
    console.log('Strategy Performance:');
    finalState.strategies.forEach(s => {
      console.log(`\n${s.name}:`);
      console.log(`  Type: ${s.type}`);
      console.log(`  Executions: ${s.totalExecutions}`);
      console.log(`  P&L: $${s.totalPnL.toFixed(2)}`);
      console.log(`  Status: ${s.status}`);
      if (s.lastError) {
        console.log(`  Last Error: ${s.lastError}`);
      }
    });

    const history = botExecutionService.getExecutionHistory();
    console.log(`\nTotal Executions: ${history.length}`);
    console.log(`Successful: ${history.filter(e => e.success).length}`);
    console.log(`Failed: ${history.filter(e => !e.success).length}`);

    // CoinGecko stats
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📊 COINGECKO STATS\n');
    
    const cacheStats = coinGeckoService.getCacheStats();
    console.log(`Cache Size: ${cacheStats.size}`);
    console.log(`Cached Symbols: ${cacheStats.symbols.join(', ')}`);

    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('✅ TEST COMPLETE!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    
    botExecutionService.stop();
    throw error;
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping bot...');
  botExecutionService.stop();
  process.exit(0);
});

testBotExecution()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
