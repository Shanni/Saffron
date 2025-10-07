#!/usr/bin/env node

/**
 * Test script for Saffron Unified API
 * Tests the combined API functionality for trading and bridging
 */

const { SaffronAPI } = require('../api');

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

// Test function for Unified API
async function testUnifiedAPI() {
  log('🌸 Testing Saffron Unified API', colors.bright + colors.magenta);
  log('===========================', colors.bright + colors.magenta);
  console.log();

  const api = new SaffronAPI();

  // Test 1: Get Trade Preview (Valid)
  try {
    log('📊 Test 1: Get Trade Preview (Valid)', colors.bright);
    const preview = await api.getTradePreview('APT', 'buy', 10);
    logResult('Get Trade Preview', 
      preview && preview.valid && preview.symbol === 'APT', 
      preview
    );
  } catch (error) {
    logResult('Get Trade Preview', false, null, error);
  }

  // Test 2: Get Trade Preview (Invalid Symbol)
  try {
    log('📊 Test 2: Get Trade Preview (Invalid Symbol)', colors.bright);
    const preview = await api.getTradePreview('INVALID', 'buy', 10);
    logResult('Get Invalid Trade Preview', 
      preview && !preview.valid && preview.error, 
      preview
    );
  } catch (error) {
    logResult('Get Invalid Trade Preview', false, null, error);
  }

  // Test 3: Get Trade Preview (Limit Order)
  try {
    log('📊 Test 3: Get Trade Preview (Limit Order)', colors.bright);
    const preview = await api.getTradePreview('ETH', 'sell', 5, 2500, 'limit');
    logResult('Get Limit Order Preview', 
      preview && preview.valid && preview.type === 'limit', 
      preview
    );
  } catch (error) {
    logResult('Get Limit Order Preview', false, null, error);
  }

  // Test 4: Get Bridge Preview (Valid)
  try {
    log('🌉 Test 4: Get Bridge Preview (Valid)', colors.bright);
    const preview = await api.getBridgePreview('arbitrum', 'base', '100');
    logResult('Get Bridge Preview', 
      preview && preview.valid && preview.sourceChain === 'arbitrum', 
      preview
    );
  } catch (error) {
    logResult('Get Bridge Preview', false, null, error);
  }

  // Test 5: Get Bridge Preview (Invalid Chain)
  try {
    log('🌉 Test 5: Get Bridge Preview (Invalid Chain)', colors.bright);
    const preview = await api.getBridgePreview('invalid-chain', 'base', '100');
    logResult('Get Invalid Bridge Preview', 
      preview && !preview.valid && preview.error, 
      preview
    );
  } catch (error) {
    logResult('Get Invalid Bridge Preview', false, null, error);
  }

  // Test 6: Get Bridge Preview (Same Chain)
  try {
    log('🌉 Test 6: Get Bridge Preview (Same Chain)', colors.bright);
    const preview = await api.getBridgePreview('arbitrum', 'arbitrum', '100');
    logResult('Get Same Chain Bridge Preview', 
      preview && !preview.valid && preview.error, 
      preview
    );
  } catch (error) {
    logResult('Get Same Chain Bridge Preview', false, null, error);
  }

  log('🏁 Unified API Tests Completed', colors.bright + colors.green);
}

// Run the tests
testUnifiedAPI().catch(error => {
  log(`❌ Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});
