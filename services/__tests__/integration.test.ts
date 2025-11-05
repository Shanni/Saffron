// Integration test: Drift + Hyperliquid arbitrage

import { driftService, DRIFT_MARKETS } from '../driftService';
import { hyperliquidService } from '../hyperliquidService';

describe('Drift + Hyperliquid Integration', () => {
  const mockWallet = {
    publicKey: {
      toString: () => 'TestWallet1111111111111111111111111111',
    },
    address: '0xTestWallet1111111111111111111111111',
  };

  beforeAll(async () => {
    await driftService.initialize(mockWallet);
    await hyperliquidService.initialize(mockWallet);
  });

  afterAll(async () => {
    await driftService.disconnect();
    await hyperliquidService.disconnect();
  });

  test('both services should be ready', () => {
    expect(driftService.isReady()).toBe(true);
    expect(hyperliquidService.isReady()).toBe(true);
  });

  test('should detect arbitrage opportunity', async () => {
    const driftPrice = await driftService.getMarketPrice(DRIFT_MARKETS['SOL-PERP']);
    const hyperliquidPrice = await hyperliquidService.getMarketPrice('SOL');

    const priceDiff = Math.abs(driftPrice - hyperliquidPrice);
    const priceDiffPercent = (priceDiff / driftPrice) * 100;

    console.log('Drift SOL price:', driftPrice);
    console.log('Hyperliquid SOL price:', hyperliquidPrice);
    console.log('Price difference:', priceDiffPercent.toFixed(4), '%');

    expect(driftPrice).toBeGreaterThan(0);
    expect(hyperliquidPrice).toBeGreaterThan(0);

    // Arbitrage opportunity if price diff > 0.5%
    if (priceDiffPercent > 0.5) {
      console.log('✅ Arbitrage opportunity detected!');
      
      if (driftPrice < hyperliquidPrice) {
        console.log('Strategy: Buy on Drift, Sell on Hyperliquid');
      } else {
        console.log('Strategy: Buy on Hyperliquid, Sell on Drift');
      }
    } else {
      console.log('❌ No arbitrage opportunity (spread too small)');
    }
  });

  test('should execute arbitrage trade simulation', async () => {
    const driftPrice = await driftService.getMarketPrice(DRIFT_MARKETS['SOL-PERP']);
    const hyperliquidPrice = await hyperliquidService.getMarketPrice('SOL');

    // Simulate arbitrage: buy low, sell high
    let buyDex, sellDex, buyPrice, sellPrice;

    if (driftPrice < hyperliquidPrice) {
      buyDex = 'Drift';
      sellDex = 'Hyperliquid';
      buyPrice = driftPrice;
      sellPrice = hyperliquidPrice;

      // Buy on Drift
      const driftTx = await driftService.openPosition({
        marketIndex: DRIFT_MARKETS['SOL-PERP'],
        direction: 'long',
        baseAssetAmount: 1_000_000_000, // 1 SOL
        leverage: 10,
      });

      // Sell on Hyperliquid
      const hyperliquidTx = await hyperliquidService.placeOrder({
        symbol: 'SOL',
        side: 'sell',
        size: 1,
        leverage: 10,
        orderType: 'market',
      });

      expect(driftTx).toBeTruthy();
      expect(hyperliquidTx).toBeTruthy();

    } else {
      buyDex = 'Hyperliquid';
      sellDex = 'Drift';
      buyPrice = hyperliquidPrice;
      sellPrice = driftPrice;

      // Buy on Hyperliquid
      const hyperliquidTx = await hyperliquidService.placeOrder({
        symbol: 'SOL',
        side: 'buy',
        size: 1,
        leverage: 10,
        orderType: 'market',
      });

      // Sell on Drift
      const driftTx = await driftService.openPosition({
        marketIndex: DRIFT_MARKETS['SOL-PERP'],
        direction: 'short',
        baseAssetAmount: 1_000_000_000, // 1 SOL
        leverage: 10,
      });

      expect(driftTx).toBeTruthy();
      expect(hyperliquidTx).toBeTruthy();
    }

    const profit = sellPrice - buyPrice;
    const profitPercent = (profit / buyPrice) * 100;

    console.log(`\nArbitrage Execution:`);
    console.log(`Buy on ${buyDex}: $${buyPrice.toFixed(2)}`);
    console.log(`Sell on ${sellDex}: $${sellPrice.toFixed(2)}`);
    console.log(`Profit: $${profit.toFixed(2)} (${profitPercent.toFixed(4)}%)`);
  });

  test('should compare funding rates', async () => {
    const driftFunding = await driftService.getFundingRate(DRIFT_MARKETS['SOL-PERP']);
    const hyperliquidFunding = await hyperliquidService.getFundingRate('SOL');

    console.log('\nFunding Rate Comparison:');
    console.log('Drift:', (driftFunding * 100).toFixed(4), '% per hour');
    console.log('Hyperliquid:', (hyperliquidFunding * 100).toFixed(4), '% per hour');

    const fundingDiff = Math.abs(driftFunding - hyperliquidFunding);
    console.log('Difference:', (fundingDiff * 100).toFixed(4), '% per hour');

    expect(driftFunding).toBeDefined();
    expect(hyperliquidFunding).toBeDefined();
  });

  test('should compare liquidation prices at different leverages', () => {
    const entryPrice = 145;
    const leverages = [3, 5, 10, 20, 40];

    console.log('\nLiquidation Price Comparison (Entry: $145):');
    console.log('Leverage | Drift Long | Hyperliquid Long | Drift Short | Hyperliquid Short');
    console.log('---------|------------|------------------|-------------|------------------');

    leverages.forEach(leverage => {
      const driftLongLiq = driftService.calculateLiquidationPrice(entryPrice, leverage, 'long');
      const hlLongLiq = hyperliquidService.calculateLiquidationPrice(entryPrice, leverage, 'long');
      const driftShortLiq = driftService.calculateLiquidationPrice(entryPrice, leverage, 'short');
      const hlShortLiq = hyperliquidService.calculateLiquidationPrice(entryPrice, leverage, 'short');

      console.log(
        `${leverage}x      | $${driftLongLiq.toFixed(2)}     | $${hlLongLiq.toFixed(2)}          | $${driftShortLiq.toFixed(2)}      | $${hlShortLiq.toFixed(2)}`
      );
    });
  });
});
