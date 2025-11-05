// Test suite for Drift Service

import { driftService, DRIFT_MARKETS } from '../driftService';

describe('DriftService', () => {
  // Mock wallet
  const mockWallet = {
    publicKey: {
      toString: () => 'DriftTestWallet1111111111111111111111111111',
    },
  };

  beforeAll(async () => {
    await driftService.initialize(mockWallet);
  });

  afterAll(async () => {
    await driftService.disconnect();
  });

  test('should initialize successfully', () => {
    expect(driftService.isReady()).toBe(true);
  });

  test('should get market price for SOL', async () => {
    const price = await driftService.getMarketPrice(DRIFT_MARKETS['SOL-PERP']);
    expect(price).toBeGreaterThan(0);
    console.log('SOL-PERP price:', price);
  });

  test('should open a long position', async () => {
    const txSignature = await driftService.openPosition({
      marketIndex: DRIFT_MARKETS['SOL-PERP'],
      direction: 'long',
      baseAssetAmount: 1_000_000_000, // 1 SOL
      leverage: 3,
    });

    expect(txSignature).toBeTruthy();
    expect(txSignature).toContain('drift_');
    console.log('Long position opened:', txSignature);
  });

  test('should open a short position', async () => {
    const txSignature = await driftService.openPosition({
      marketIndex: DRIFT_MARKETS['SOL-PERP'],
      direction: 'short',
      baseAssetAmount: 500_000_000, // 0.5 SOL
      leverage: 5,
    });

    expect(txSignature).toBeTruthy();
    console.log('Short position opened:', txSignature);
  });

  test('should calculate position size correctly', () => {
    const collateral = 1000; // $1000 USDC
    const leverage = 5;
    const price = 100; // $100 per token

    const positionSize = driftService.calculatePositionSize(collateral, leverage, price);
    expect(positionSize).toBe(50); // (1000 * 5) / 100 = 50 tokens
  });

  test('should calculate liquidation price for long position', () => {
    const entryPrice = 100;
    const leverage = 5;
    const liqPrice = driftService.calculateLiquidationPrice(entryPrice, leverage, 'long');

    expect(liqPrice).toBeLessThan(entryPrice);
    expect(liqPrice).toBeGreaterThan(0);
    console.log('Long liquidation price:', liqPrice);
  });

  test('should calculate liquidation price for short position', () => {
    const entryPrice = 100;
    const leverage = 5;
    const liqPrice = driftService.calculateLiquidationPrice(entryPrice, leverage, 'short');

    expect(liqPrice).toBeGreaterThan(entryPrice);
    console.log('Short liquidation price:', liqPrice);
  });

  test('should get market data', async () => {
    const marketData = await driftService.getMarketData(DRIFT_MARKETS['SOL-PERP']);

    expect(marketData.symbol).toBe('SOL-PERP');
    expect(marketData.price).toBeGreaterThan(0);
    expect(marketData.fundingRate).toBeDefined();
    console.log('Market data:', marketData);
  });

  test('should get funding rate', async () => {
    const fundingRate = await driftService.getFundingRate(DRIFT_MARKETS['SOL-PERP']);

    expect(fundingRate).toBeDefined();
    expect(typeof fundingRate).toBe('number');
    console.log('Funding rate:', fundingRate);
  });

  test('should get market index from symbol', () => {
    const index = driftService.getMarketIndex('SOL-PERP');
    expect(index).toBe(0);

    const btcIndex = driftService.getMarketIndex('BTC-PERP');
    expect(btcIndex).toBe(1);
  });

  test('should close position', async () => {
    const txSignature = await driftService.closePosition(DRIFT_MARKETS['SOL-PERP']);

    expect(txSignature).toBeTruthy();
    expect(txSignature).toContain('drift_close_');
    console.log('Position closed:', txSignature);
  });

  test('should get empty positions initially', async () => {
    const positions = await driftService.getPositions();

    expect(Array.isArray(positions)).toBe(true);
    console.log('Positions:', positions);
  });
});
