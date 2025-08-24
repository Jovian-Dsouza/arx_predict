# ArxPredict Event Listener

This script allows you to listen to events emitted by the ArxPredict program and display them in real-time in your console.

## Features

- 🎧 Listen to all program events simultaneously
- 📡 Listen to specific event types
- 🕒 Timestamped event logging
- 🛑 Graceful shutdown with Ctrl+C
- 🔄 Automatic connection maintenance

## Usage

### Listen to All Events

```bash
# Using npm
npm run listen

# Using yarn
yarn listen

# Direct execution
npx ts-node client/event_listener.ts
```

### Listen to Specific Events

```bash
# Listen to buy shares events
npm run listen:buy

# Listen to sell shares events  
npm run listen:sell

# Listen to vote events
npm run listen:vote

# Listen to probability reveal events
npm run listen:reveal

# Listen to any specific event
npx ts-node client/event_listener.ts sendPaymentEvent
```

## Available Event Types

- `voteEvent` - When users vote on market outcomes
- `revealResultEvent` - When market results are revealed
- `revealProbsEvent` - When market probabilities are revealed
- `buySharesEvent` - When users buy shares in a market
- `sellSharesEvent` - When users sell shares in a market
- `claimRewardsEvent` - When rewards are claimed
- `initMarketStatsEvent` - When market statistics are initialized

## Example Output

```
🎧 Starting event listener for ArxPredict program...
Program ID: ArxPredict111111111111111111111111111111111111111
Listening for events...

✅ Listening for buySharesEvent events
✅ Listening for sellSharesEvent events
✅ Listening for createMarketEvent events
✅ Listening for createUserPositionEvent events
✅ Listening for sendPaymentEvent events
✅ Listening for withdrawPaymentEvent events
✅ Listening for settleMarketEvent events
✅ Listening for claimRewardsEvent events
✅ Listening for revealProbsEvent events

🚀 Event listener is active. Press Ctrl+C to stop.

[2024-01-15T10:30:45.123Z] 📡 buySharesEvent:
{
  "marketId": 1,
  "vote": 0,
  "shares": 1000000,
  "amount": 500000
}
──────────────────────────────────────────────────
```

## Configuration

The script uses the same configuration as your other ArxPredict scripts:

- **Network**: Solana Devnet
- **Wallet**: Your Solana keypair from `~/.config/solana/id.json`
- **Program**: ArxPredict program ID from your build artifacts
- **Cluster**: Arcium cluster account

## Stopping the Listener

Press `Ctrl+C` to gracefully stop the event listener. The script will:

1. Remove all event listeners
2. Close connections
3. Exit cleanly

## Troubleshooting

### Connection Issues
- Ensure your Solana CLI is configured for devnet
- Check that your wallet has sufficient SOL for transaction fees
- Verify the program ID is correct

### No Events Showing
- Make sure the ArxPredict program is deployed and active
- Check that other scripts are actually triggering events
- Verify you're connected to the correct network

### TypeScript Errors
- Ensure all dependencies are installed: `npm install`
- Check that the build artifacts exist in `target/` directory
- Verify TypeScript configuration in `tsconfig.json`

## Dependencies

- `@coral-xyz/anchor` - Solana program framework
- `@solana/web3.js` - Solana web3 client
- `@arcium-hq/client` - Arcium client library
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution engine
