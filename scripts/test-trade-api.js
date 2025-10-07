#!/usr/bin/env node

/**
 * Test script for Saffron Trading API
 * Tests the Ekiden integration for trading functionality
 */

const { EkidenAPI } = require('../api/ekiden');

// Mock signature for testing
const MOCK_SIGNATURE = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const MOCK_PUBLIC_KEY = '0x123456789abcdef0123456789abcdef0123456789';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to log with colors
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to log test results
function logResult(testName, success, result, error = null) {
  if (success) {
    log(`✅ ${testName}: Success`, colors.green);
    if (result) {
      log(`   ${JSON.stringify(result, null, 2)}`, colors.dim);
    }
  } else {
    log(`❌ ${testName}: Failed`, colors.red);
    if (error) {
      log(`   Error: ${error.message || error}`, colors.red);
    }
  }
  console.log(); // Empty line for readability
}

// Test function for Ekiden API
async function testEkidenAPI() {
  log('🚀 Testing Ekiden Trading API', colors.bright + colors.cyan);
  log('============================', colors.bright + colors.cyan);
  console.log();

  const api = new EkidenAPI();

  // Test 1: Get all markets
  try {
    log('📊 Test 1: Get All Markets', colors.bright);
    const markets = api.getAllMarkets();
    logResult('Get All Markets', true, `Found ${markets.length} markets`);
    
    // Print first market as example
    if (markets.length > 0) {
      log(`   Example market: ${markets[0].symbol}`, colors.dim);
      log(`   - Market address: ${markets[0].market_addr}`, colors.dim);
      log(`   - Min size: ${markets[0].min_size}`, colors.dim);
      log(`   - Max size: ${markets[0].max_size}`, colors.dim);
    }
  } catch (error) {
    logResult('Get All Markets', false, null, error);
  }

  // Test 2: Get specific market info
  try {
    log('📊 Test 2: Get Market Info for APT', colors.bright);
    const market = api.getMarketInfo('APT');
    logResult('Get Market Info', Boolean(market), market);
  } catch (error) {
    logResult('Get Market Info', false, null, error);
  }

  // Test 3: Validate valid order
  try {
    log('📊 Test 3: Validate Valid Order', colors.bright);
    const validation = api.validateOrder('APT', 1);
    logResult('Validate Order', validation.valid, validation);
  } catch (error) {
    logResult('Validate Order', false, null, error);
  }

  // Test 4: Validate invalid order (too small)
  try {
    log('📊 Test 4: Validate Invalid Order (Too Small)', colors.bright);
    const validation = api.validateOrder('APT', 0.01);
    logResult('Validate Small Order', !validation.valid, validation);
  } catch (error) {
    logResult('Validate Small Order', false, null, error);
  }

  // Test 5: Validate invalid order (too large)
  try {
    log('📊 Test 5: Validate Invalid Order (Too Large)', colors.bright);
    const validation = api.validateOrder('APT', 20000);
    logResult('Validate Large Order', !validation.valid, validation);
  } catch (error) {
    logResult('Validate Large Order', false, null, error);
  }

  // Test 6: Validate invalid symbol
  try {
    log('📊 Test 6: Validate Invalid Symbol', colors.bright);
    const validation = api.validateOrder('INVALID', 1);
    logResult('Validate Invalid Symbol', !validation.valid, validation);
  } catch (error) {
    logResult('Validate Invalid Symbol', false, null, error);
  }

  // Test 7: Authentication (mocked)
  try {
    log('🔐 Test 7: Authentication (Mocked)', colors.bright);
    log('   Note: This test is mocked and will not make a real API call', colors.yellow);
    
    // Override the fetch method temporarily for testing
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: 'mock-token-12345' })
      })
    );

    const token = await api.authenticate(MOCK_PUBLIC_KEY, MOCK_SIGNATURE);
    
    // Restore original fetch
    global.fetch = originalFetch;
    
    logResult('Authentication', token === 'mock-token-12345', { token });
  } catch (error) {
    logResult('Authentication', false, null, error);
  }

  // Test 8: Create Market Order (mocked)
  try {
    log('📈 Test 8: Create Market Order (Mocked)', colors.bright);
    log('   Note: This test is mocked and will not make a real API call', colors.yellow);
    
    // Override the sendIntent method temporarily for testing
    api.sendIntent = jest.fn().mockImplementation(() => 
      Promise.resolve({
        output: {
          outputs: [{ sid: 'mock-order-id-12345' }],
          type: 'order_create'
        },
        seq: 1,
        timestamp: Date.now(),
        version: 1
      })
    );

    const result = await api.createMarketOrder('APT', 'buy', 1, 1, 123456789, MOCK_SIGNATURE);
    logResult('Create Market Order', result.output.type === 'order_create', result);
  } catch (error) {
    logResult('Create Market Order', false, null, error);
  }

  // Test 9: Create Limit Order (mocked)
  try {
    log('📉 Test 9: Create Limit Order (Mocked)', colors.bright);
    log('   Note: This test is mocked and will not make a real API call', colors.yellow);
    
    // Override the sendIntent method temporarily for testing
    api.sendIntent = jest.fn().mockImplementation(() => 
      Promise.resolve({
        output: {
          outputs: [{ sid: 'mock-limit-order-id-12345' }],
          type: 'order_create'
        },
        seq: 2,
        timestamp: Date.now(),
        version: 1
      })
    );

    const result = await api.createLimitOrder('APT', 'sell', 1, 10.5, 1, 123456790, MOCK_SIGNATURE);
    logResult('Create Limit Order', result.output.type === 'order_create', result);
  } catch (error) {
    logResult('Create Limit Order', false, null, error);
  }

  log('🏁 Ekiden API Tests Completed', colors.bright + colors.green);
}

// Run the tests
testEkidenAPI().catch(error => {
  log(`❌ Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});
