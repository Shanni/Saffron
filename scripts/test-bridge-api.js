#!/usr/bin/env node

/**
 * Test script for Saffron Bridge API
 * Tests the CCTP integration for cross-chain transfers
 */

const { CCTPAPI } = require('../api/cctp');

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

// Test function for CCTP API
async function testCCTPAPI() {
  log('🌉 Testing CCTP Bridge API', colors.bright + colors.cyan);
  log('=========================', colors.bright + colors.cyan);
  console.log();

  const api = new CCTPAPI();

  // Test 1: Get supported chains
  try {
    log('🔗 Test 1: Get Supported Chains', colors.bright);
    const chains = api.getSupportedChains();
    logResult('Get Supported Chains', true, `Found ${chains.length} chains`);
    
    // Print first few chains as examples
    if (chains.length > 0) {
      for (let i = 0; i < Math.min(3, chains.length); i++) {
        log(`   ${chains[i].displayName} (${chains[i].name})`, colors.dim);
        log(`   - Chain ID: ${chains[i].id}`, colors.dim);
        log(`   - Estimated finality: ${chains[i].estimatedFinality} minutes`, colors.dim);
      }
      if (chains.length > 3) {
        log(`   ... and ${chains.length - 3} more chains`, colors.dim);
      }
    }
  } catch (error) {
    logResult('Get Supported Chains', false, null, error);
  }

  // Test 2: Get specific chain info
  try {
    log('🔗 Test 2: Get Chain Info for Arbitrum', colors.bright);
    const chain = api.getChain('arbitrum');
    logResult('Get Chain Info', Boolean(chain), chain);
  } catch (error) {
    logResult('Get Chain Info', false, null, error);
  }

  // Test 3: Get invalid chain
  try {
    log('🔗 Test 3: Get Invalid Chain', colors.bright);
    const chain = api.getChain('invalid-chain');
    logResult('Get Invalid Chain', chain === null, { result: 'Chain is null as expected' });
  } catch (error) {
    logResult('Get Invalid Chain', false, null, error);
  }

  // Test 4: Estimate transfer
  try {
    log('💸 Test 4: Estimate Transfer (Arbitrum → Base)', colors.bright);
    const estimate = await api.estimateTransfer('arbitrum', 'base', '100');
    logResult('Estimate Transfer', 
      estimate && typeof estimate.estimatedTime === 'number', 
      estimate
    );
  } catch (error) {
    logResult('Estimate Transfer', false, null, error);
  }

  // Test 5: Estimate invalid transfer
  try {
    log('💸 Test 5: Estimate Invalid Transfer', colors.bright);
    await api.estimateTransfer('invalid-chain', 'base', '100');
    logResult('Estimate Invalid Transfer', false, 'Should have thrown an error');
  } catch (error) {
    logResult('Estimate Invalid Transfer', true, { error: error.message });
  }

  // Test 6: Validate valid transfer
  try {
    log('✅ Test 6: Validate Valid Transfer', colors.bright);
    const validation = api.validateTransfer(
      'arbitrum', 
      'base', 
      '100', 
      '0x1234567890abcdef1234567890abcdef12345678'
    );
    logResult('Validate Transfer', validation.valid, validation);
  } catch (error) {
    logResult('Validate Transfer', false, null, error);
  }

  // Test 7: Validate invalid transfer (same chains)
  try {
    log('❌ Test 7: Validate Invalid Transfer (Same Chains)', colors.bright);
    const validation = api.validateTransfer(
      'arbitrum', 
      'arbitrum', 
      '100', 
      '0x1234567890abcdef1234567890abcdef12345678'
    );
    logResult('Validate Same Chains', !validation.valid, validation);
  } catch (error) {
    logResult('Validate Same Chains', false, null, error);
  }

  // Test 8: Validate invalid transfer (amount too small)
  try {
    log('❌ Test 8: Validate Invalid Transfer (Amount Too Small)', colors.bright);
    const validation = api.validateTransfer(
      'arbitrum', 
      'base', 
      '0.5', 
      '0x1234567890abcdef1234567890abcdef12345678'
    );
    logResult('Validate Small Amount', !validation.valid, validation);
  } catch (error) {
    logResult('Validate Small Amount', false, null, error);
  }

  // Test 9: Validate invalid transfer (invalid recipient)
  try {
    log('❌ Test 9: Validate Invalid Transfer (Invalid Recipient)', colors.bright);
    const validation = api.validateTransfer(
      'arbitrum', 
      'base', 
      '100', 
      '0x123'
    );
    logResult('Validate Invalid Recipient', !validation.valid, validation);
  } catch (error) {
    logResult('Validate Invalid Recipient', false, null, error);
  }

  // Test 10: Initiate transfer
  try {
    log('🚀 Test 10: Initiate Transfer', colors.bright);
    const result = await api.initiateTransfer(
      'arbitrum',
      'base',
      '100',
      '0x1234567890abcdef1234567890abcdef12345678',
      '0xabcdef1234567890abcdef1234567890abcdef12'
    );
    logResult('Initiate Transfer', 
      result && result.txHash && result.messageHash, 
      result
    );
    
    // Store message hash for next test
    global.testMessageHash = result.messageHash;
  } catch (error) {
    logResult('Initiate Transfer', false, null, error);
  }

  // Test 11: Get transfer status
  try {
    log('📊 Test 11: Get Transfer Status', colors.bright);
    // Use message hash from previous test or a mock one
    const messageHash = global.testMessageHash || `0x${Math.random().toString(16).substr(2, 64)}`;
    const status = await api.getTransferStatus(messageHash);
    logResult('Get Transfer Status', 
      status && ['pending', 'attested', 'completed', 'failed'].includes(status.status), 
      status
    );
  } catch (error) {
    logResult('Get Transfer Status', false, null, error);
  }

  // Test 12: Get attestation (mocked)
  try {
    log('📝 Test 12: Get Attestation (Mocked)', colors.bright);
    log('   Note: This test is mocked and will not make a real API call', colors.yellow);
    
    // Override the fetch method temporarily for testing
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ attestation: 'mock-attestation-data-12345' })
      })
    );

    const messageHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const attestation = await api.getAttestation(messageHash);
    
    // Restore original fetch
    global.fetch = originalFetch;
    
    logResult('Get Attestation', attestation === 'mock-attestation-data-12345', { attestation });
  } catch (error) {
    logResult('Get Attestation', false, null, error);
  }

  // Test 13: Complete transfer
  try {
    log('✅ Test 13: Complete Transfer', colors.bright);
    const txHash = await api.completeTransfer(
      'base',
      `0x${Math.random().toString(16).substr(2, 64)}`,
      'mock-attestation-data',
      '0x1234567890abcdef1234567890abcdef12345678'
    );
    logResult('Complete Transfer', Boolean(txHash), { txHash });
  } catch (error) {
    logResult('Complete Transfer', false, null, error);
  }

  log('🏁 CCTP API Tests Completed', colors.bright + colors.green);
}

// Run the tests
testCCTPAPI().catch(error => {
  log(`❌ Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});
