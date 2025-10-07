# Saffron API Client

This directory contains the client-side API integration for the Saffron app.

## Backend API

The backend API server is located at `/backend` and must be running for the app to work.

Start the backend:
```bash
cd backend
npm install
npm start  # Runs on http://localhost:3000
```

## API Clients

- `backend-client.ts` - **Main client** - Connects to backend API (recommended)
- `index.ts` - Legacy mock API
- `ekiden.ts` - Direct Ekiden API client (for reference)
- `cctp.ts` - Direct CCTP API client (for reference)

## Usage

```typescript
import backendAPI from '@/api/backend-client';

// Login
await backendAPI.login('0x123...');

// Get markets
const markets = await backendAPI.getMarkets();

// Get trade preview
const preview = await backendAPI.getTradePreview('APT', 'buy', 5);

// Execute trade (requires signature)
const result = await backendAPI.executeTrade({
  symbol: 'APT',
  side: 'buy',
  size: 5,
  type: 'market',
  leverage: 1,
  nonce: Date.now(),
  signature: '0x...'
});
const api = new SaffronAPI();

// Get trade preview
const tradePreview = await api.getTradePreview('APT', 'buy', 10);

// Get bridge preview
const bridgePreview = await api.getBridgePreview('arbitrum', 'base', '100');
```

## API Documentation

For full API documentation, see the backend README.md file.
