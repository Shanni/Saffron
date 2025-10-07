# Saffron API Test Scripts

This directory contains scripts for testing the Saffron API functionality.

## Available Scripts

### `run-api-tests.sh`

Runs all API test scripts in sequence with nice formatting.

```bash
# Make executable
chmod +x scripts/run-api-tests.sh

# Run all tests
./scripts/run-api-tests.sh
```

### Individual Test Scripts

#### `test-unified-api.js`
Tests the main Saffron API that combines trading and bridging functionality.

```bash
node scripts/test-unified-api.js
```

#### `test-trade-api.js`
Tests the Ekiden trading API integration.

```bash
node scripts/test-trade-api.js
```

#### `test-bridge-api.js`
Tests the CCTP bridge API integration.

```bash
node scripts/test-bridge-api.js
```

#### `test-command-parser.js`
Tests the natural language command parser.

```bash
node scripts/test-command-parser.js
```

## API Structure

The Saffron API is organized into three main components:

1. **SaffronAPI** (`api/index.ts`) - Unified API facade that provides:
   - `getTradePreview()` - Preview trading operations
   - `getBridgePreview()` - Preview bridge operations

2. **EkidenAPI** (`api/ekiden.ts`) - Trading functionality:
   - Market information and validation
   - Order creation (market/limit)
   - Authentication

3. **CCTPAPI** (`api/cctp.ts`) - Bridging functionality:
   - Chain information
   - Transfer validation and estimation
   - Transfer initiation and completion

## Test Coverage

The test scripts cover:

- ✅ API method validation
- ✅ Error handling
- ✅ Parameter validation
- ✅ Mock responses
- ✅ Natural language command parsing

## Notes

These tests use mock implementations and do not make real API calls. To connect to real APIs:

1. Update the implementation in the respective API files
2. Add proper authentication
3. Handle real network requests and responses

## Example Usage in Application

```typescript
// Example of how the API is used in the application
import SaffronAPI from '@/api';

// Initialize API
const api = new SaffronAPI();

// Parse user command
const command = parseCommand('Buy 10 APT');

// Get preview
if (command.type === 'trade' && command.symbol && command.amount) {
  const preview = await api.getTradePreview(
    command.symbol,
    command.action === 'sell' ? 'sell' : 'buy',
    command.amount,
    command.price
  );
  
  // Show preview to user
  showPreviewModal(preview);
}
```
