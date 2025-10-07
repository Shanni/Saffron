#!/usr/bin/env node

/**
 * Test script for Saffron Command Parser
 * Tests the natural language command parsing functionality
 */

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

// Command parser function (simplified version of what's in the app)
function parseCommand(text) {
  const lowerText = text.toLowerCase();
  
  // Extract amount
  const amountMatch = text.match(/\$?(\d+(?:\.\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;

  // Extract price
  const priceMatch = text.match(/(?:at|@)\s*\$?(\d+(?:\.\d{2})?)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;

  // Trading commands
  if (lowerText.includes('buy') || lowerText.includes('long')) {
    const symbolMatch = text.match(/\b([A-Z]{2,5})\b/);
    return {
      type: 'trade',
      action: 'buy',
      symbol: symbolMatch?.[1],
      amount,
      price,
      description: text
    };
  }

  if (lowerText.includes('sell') || lowerText.includes('short')) {
    const symbolMatch = text.match(/\b([A-Z]{2,5})\b/);
    return {
      type: 'trade',
      action: 'sell',
      symbol: symbolMatch?.[1],
      amount,
      price,
      description: text
    };
  }

  // Bridge commands
  if (lowerText.includes('deposit') || lowerText.includes('bridge in')) {
    const chainMatch = text.match(/(?:from|on)\s+([a-zA-Z]+)/i);
    return {
      type: 'deposit',
      action: 'deposit',
      amount,
      chain: chainMatch?.[1]?.toLowerCase(),
      description: text
    };
  }

  if (lowerText.includes('withdraw') || lowerText.includes('bridge out')) {
    const chainMatch = text.match(/(?:to|on)\s+([a-zA-Z]+)/i);
    return {
      type: 'withdraw',
      action: 'withdraw',
      amount,
      chain: chainMatch?.[1]?.toLowerCase(),
      description: text
    };
  }

  return { type: 'unknown', description: text };
}

// Test function for Command Parser
async function testCommandParser() {
  log('🗣️ Testing Saffron Command Parser', colors.bright + colors.cyan);
  log('==============================', colors.bright + colors.cyan);
  console.log();

  // Test cases for trading commands
  const tradingTests = [
    {
      name: 'Simple Buy',
      input: 'Buy 10 APT',
      expected: { type: 'trade', action: 'buy', symbol: 'APT', amount: 10 }
    },
    {
      name: 'Buy with Price',
      input: 'Buy 5 ETH at $2500',
      expected: { type: 'trade', action: 'buy', symbol: 'ETH', amount: 5, price: 2500 }
    },
    {
      name: 'Buy with Dollar Sign',
      input: 'Buy $1000 of BTC',
      expected: { type: 'trade', action: 'buy', symbol: 'BTC', amount: 1000 }
    },
    {
      name: 'Simple Sell',
      input: 'Sell 20 SOL',
      expected: { type: 'trade', action: 'sell', symbol: 'SOL', amount: 20 }
    },
    {
      name: 'Sell with Price',
      input: 'Sell 2 BTC @ 50000',
      expected: { type: 'trade', action: 'sell', symbol: 'BTC', amount: 2, price: 50000 }
    },
    {
      name: 'Long Position',
      input: 'Long 15 APT',
      expected: { type: 'trade', action: 'buy', symbol: 'APT', amount: 15 }
    },
    {
      name: 'Short Position',
      input: 'Short 3 ETH',
      expected: { type: 'trade', action: 'sell', symbol: 'ETH', amount: 3 }
    }
  ];

  // Test cases for bridge commands
  const bridgeTests = [
    {
      name: 'Simple Deposit',
      input: 'Deposit $200 USDC from Arbitrum',
      expected: { type: 'deposit', action: 'deposit', amount: 200, chain: 'arbitrum' }
    },
    {
      name: 'Bridge In',
      input: 'Bridge in 500 USDC from Ethereum',
      expected: { type: 'deposit', action: 'deposit', amount: 500, chain: 'ethereum' }
    },
    {
      name: 'Simple Withdraw',
      input: 'Withdraw $150 USDC to Base',
      expected: { type: 'withdraw', action: 'withdraw', amount: 150, chain: 'base' }
    },
    {
      name: 'Bridge Out',
      input: 'Bridge out 300 USDC to Polygon',
      expected: { type: 'withdraw', action: 'withdraw', amount: 300, chain: 'polygon' }
    }
  ];

  // Test cases for invalid commands
  const invalidTests = [
    {
      name: 'Empty Command',
      input: '',
      expected: { type: 'unknown' }
    },
    {
      name: 'Unknown Command',
      input: 'Hello world',
      expected: { type: 'unknown' }
    },
    {
      name: 'Incomplete Buy',
      input: 'Buy APT',
      expected: { type: 'trade', action: 'buy', symbol: 'APT', amount: undefined }
    },
    {
      name: 'Incomplete Deposit',
      input: 'Deposit from Arbitrum',
      expected: { type: 'deposit', action: 'deposit', amount: undefined, chain: 'arbitrum' }
    }
  ];

  // Run trading tests
  log('📈 Trading Command Tests', colors.bright);
  for (const test of tradingTests) {
    const result = parseCommand(test.input);
    const success = result.type === test.expected.type && 
                    result.action === test.expected.action &&
                    result.symbol === test.expected.symbol &&
                    result.amount === test.expected.amount &&
                    (test.expected.price === undefined || result.price === test.expected.price);
    
    logResult(`"${test.input}"`, success, result);
  }

  // Run bridge tests
  log('🌉 Bridge Command Tests', colors.bright);
  for (const test of bridgeTests) {
    const result = parseCommand(test.input);
    const success = result.type === test.expected.type && 
                    result.action === test.expected.action &&
                    result.amount === test.expected.amount &&
                    result.chain === test.expected.chain;
    
    logResult(`"${test.input}"`, success, result);
  }

  // Run invalid tests
  log('❓ Invalid Command Tests', colors.bright);
  for (const test of invalidTests) {
    const result = parseCommand(test.input);
    const success = (test.expected.type === 'unknown' && result.type === 'unknown') ||
                    (result.type === test.expected.type && 
                     result.action === test.expected.action &&
                     (test.expected.symbol === undefined || result.symbol === test.expected.symbol) &&
                     (test.expected.amount === undefined || result.amount === test.expected.amount) &&
                     (test.expected.chain === undefined || result.chain === test.expected.chain));
    
    logResult(`"${test.input}"`, success, result);
  }

  log('🏁 Command Parser Tests Completed', colors.bright + colors.green);
}

// Run the tests
testCommandParser().catch(error => {
  log(`❌ Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});
