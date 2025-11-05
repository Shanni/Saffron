// Test Trading Bot
// Run with: npm run bot:test

import { Connection, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { tradingBot } from '../services/tradingBot';
import * as fs from 'fs';

const DEVNET_RPC = 'https://solana-devnet.api.onfinality.io/public';

async function testTradingBot() {
  console.log('🤖 TRADING BOT TEST\n');
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
    console.log(`Network: Devnet\n`);

    // Initialize bot
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🔧 INITIALIZING BOT\n');
    
    await tradingBot.initialize(wallet);

    // Add DCA strategy
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📊 ADDING STRATEGIES\n');
    
    const dcaId = tradingBot.addStrategy({
      name: 'SOL DCA Strategy',
      type: 'dca',
      market: 'SOL-PERP',
      enabled: true,
      triggerType: 'time',
      triggerInterval: 30, // Every 30 seconds for testing
      leverage: 1,
      positionSize: 10, // $10 per buy
      stopLoss: 5,
      takeProfit: 10,
      dcaInterval: 30,
      dcaAmount: 10,
    });
    console.log(`   DCA Strategy ID: ${dcaId}`);

    // Add Grid strategy
    const gridId = tradingBot.addStrategy({
      name: 'SOL Grid Strategy',
      type: 'grid',
      market: 'SOL-PERP',
      enabled: true,
      triggerType: 'price',
      triggerPrice: 145,
      triggerCondition: 'crosses',
      leverage: 3,
      positionSize: 20, // $20 per grid level
      stopLoss: 3,
      takeProfit: 5,
      gridLevels: 10,
      gridSpacing: 1, // 1% spacing
      gridRange: { min: 140, max: 150 },
    });
    console.log(`   Grid Strategy ID: ${gridId}`);

    // Add Momentum strategy
    const momentumId = tradingBot.addStrategy({
      name: 'SOL Momentum Strategy',
      type: 'momentum',
      market: 'SOL-PERP',
      enabled: true,
      triggerType: 'indicator',
      leverage: 5,
      positionSize: 50, // $50 per trade
      stopLoss: 2,
      takeProfit: 8,
      momentumPeriod: 20,
      momentumThreshold: 2, // 2% momentum
    });
    console.log(`   Momentum Strategy ID: ${momentumId}`);

    // Add Mean Reversion strategy
    const reversionId = tradingBot.addStrategy({
      name: 'SOL Mean Reversion Strategy',
      type: 'meanReversion',
      market: 'SOL-PERP',
      enabled: true,
      triggerType: 'indicator',
      leverage: 3,
      positionSize: 30, // $30 per trade
      stopLoss: 3,
      takeProfit: 6,
      rsiPeriod: 14,
      rsiOversold: 30,
      rsiOverbought: 70,
    });
    console.log(`   Mean Reversion Strategy ID: ${reversionId}`);

    // Add price alerts
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🔔 ADDING PRICE ALERTS\n');
    
    tradingBot.addPriceAlert({
      market: 'SOL-PERP',
      targetPrice: 150,
      condition: 'above',
      strategy: 'momentum',
      isActive: true,
    });
    console.log('   Alert: SOL above $150 → Execute momentum');

    tradingBot.addPriceAlert({
      market: 'SOL-PERP',
      targetPrice: 140,
      condition: 'below',
      strategy: 'meanReversion',
      isActive: true,
    });
    console.log('   Alert: SOL below $140 → Execute mean reversion');

    // Start bot
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🚀 STARTING BOT\n');
    
    tradingBot.start();

    // Show status
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📊 BOT STATUS\n');
    
    const status = tradingBot.getStatus();
    console.log(`Running: ${status.isRunning ? '✅ Yes' : '❌ No'}`);
    console.log(`Active Strategies: ${status.activeStrategies}`);
    console.log(`Total Alerts: ${status.totalAlerts}`);
    console.log(`Active Alerts: ${status.activeAlerts}`);

    // Show strategies
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📋 ACTIVE STRATEGIES\n');
    
    const strategies = tradingBot.getActiveStrategies();
    strategies.forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.name}`);
      console.log(`   Type: ${s.type}`);
      console.log(`   Market: ${s.market}`);
      console.log(`   Leverage: ${s.leverage}x`);
      console.log(`   Position Size: $${s.positionSize}`);
      console.log(`   Trigger: ${s.triggerType}`);
      console.log(`   Executions: ${s.totalExecutions}`);
    });

    // Run for 2 minutes
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('⏱️  RUNNING BOT FOR 2 MINUTES...\n');
    console.log('Watch for strategy executions and price alerts!\n');
    console.log('Press Ctrl+C to stop early\n');
    console.log('═══════════════════════════════════════════════════════\n');

    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes

    // Stop bot
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🛑 STOPPING BOT\n');
    
    tradingBot.stop();

    // Final status
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📊 FINAL RESULTS\n');
    
    const finalStatus = tradingBot.getStatus();
    console.log(`Total Uptime: ${finalStatus.uptime}s`);
    
    const finalStrategies = tradingBot.getStrategies();
    console.log(`\nStrategy Executions:`);
    finalStrategies.forEach(s => {
      console.log(`   ${s.name}: ${s.totalExecutions} executions`);
    });

    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('✅ BOT TEST COMPLETE!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    
    // Stop bot on error
    tradingBot.stop();
    
    throw error;
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping bot...');
  tradingBot.stop();
  process.exit(0);
});

testTradingBot()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
