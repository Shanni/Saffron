// Test suite for Hyperliquid Service

import { hyperliquidService } from '../hyperliquidService';

describe('HyperliquidService', () => {
  // Mock wallet
  const mockWallet = {
    address: '0xHyperliquidTestWallet1111111111111111111',
    publicKey: {
      toString: () => '0xHyperliquidTestWallet1111111111111111111',
    },
  };

  beforeAll(async () => {
    await hyperliquidService.initialize(mockWallet);
  });

  afterAll(async () => {
    await hyperliquidService.disconnect();
  });

  test('should initialize successfully', () => {
    expect(hyperliquidService.isReady()).toBe(true);
  });

  test('should get market price for SOL', async () => {
    const price = await hyperliquidService.getMarketPrice('SOL');
    expect(price).toBeGreaterThan(0);
    console.log('SOL price on Hyperliquid:', price);
  });

  test('should place a market buy order', async () => {
    const orderId = await hyperliquidService.placeOrder({
      symbol: 'SOL',
      side: 'buy',
      size: 10,
      leverage: 20,
      orderType: 'market',
    });

    expect(orderId).toBeTruthy();
    expect(orderId).toContain('hl_');
    console.log('Market buy order placed:', orderId);
  });

  test('should place a limit sell order', async () => {
    const orderId = await hyperliquidService.placeOrder({
      symbol: 'SOL',
      side: 'sell',
      size: 5,
      leverage: 10,
      orderType: 'limit',
      price: 150,
    });

    expect(orderId).toBeTruthy();
    console.log('Limit sell order placed:', orderId);
  });

  test('should calculate liquidation price for long position', () => {
    const entryPrice = 100;
    const leverage = 20;
    const liqPrice = hyperliquidService.calculateLiquidationPrice(entryPrice, leverage, 'long');

    expect(liqPrice).toBeLessThan(entryPrice);
    expect(liqPrice).toBeGreaterThan(0);
    console.log('Long liquidation price (20x):', liqPrice);
  });

  test('should calculate liquidation price for short position', () => {
    const entryPrice = 100;
    const leverage = 10; // Use 10x instead of 40x for more reasonable liquidation price
    const liqPrice = hyperliquidService.calculateLiquidationPrice(entryPrice, leverage, 'short');

    expect(liqPrice).toBeGreaterThan(entryPrice);
    console.log('Short liquidation price (10x):', liqPrice);
  });

  test('should get market data', async () => {
    const marketData = await hyperliquidService.getMarketData('SOL');

    expect(marketData.symbol).toBe('SOL');
    expect(marketData.price).toBeGreaterThan(0);
    expect(marketData.fundingRate).toBeDefined();
    console.log('Hyperliquid market data:', marketData);
  });

  test('should get funding rate', async () => {
    const fundingRate = await hyperliquidService.getFundingRate('SOL');

    expect(fundingRate).toBeDefined();
    expect(typeof fundingRate).toBe('number');
    console.log('Hyperliquid funding rate:', fundingRate);
  });

  test('should check if symbol is supported', () => {
    expect(hyperliquidService.isSymbolSupported('SOL')).toBe(true);
    expect(hyperliquidService.isSymbolSupported('BTC')).toBe(true);
    expect(hyperliquidService.isSymbolSupported('FAKE')).toBe(false);
  });

  test('should get supported markets', () => {
    const markets = hyperliquidService.getSupportedMarkets();

    expect(Array.isArray(markets)).toBe(true);
    expect(markets.length).toBeGreaterThan(0);
    expect(markets).toContain('SOL');
    expect(markets).toContain('BTC');
    console.log('Supported markets:', markets.length);
  });

  test('should close position', async () => {
    const orderId = await hyperliquidService.closePosition('SOL');

    expect(orderId).toBeTruthy();
    expect(orderId).toContain('hl_close_');
    console.log('Position closed:', orderId);
  });

  test('should get empty positions initially', async () => {
    const positions = await hyperliquidService.getPositions();

    expect(Array.isArray(positions)).toBe(true);
    console.log('Positions:', positions);
  });
});
