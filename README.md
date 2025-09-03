# ArxPredict - Confidential Prediction Markets on Solana

ArxPredict is a decentralized prediction market platform built on Solana that leverages Arcium's confidential computing infrastructure to enable privacy-preserving trading and voting mechanisms. The system uses encrypted vote submission and confidential market statistics to ensure user privacy while maintaining market integrity.

## 🏗️ Architecture Overview

This project combines traditional Solana program development with Arcium's confidential computing capabilities:

- **`programs/arx_predict/`** - Main Solana program (Anchor-based) handling on-chain state and coordination
- **`encrypted-ixs/`** - Confidential computing circuits using Arcis framework for privacy-preserving market logic
- **`client/`** - TypeScript client utilities for program interaction, deployment, and event monitoring



## 📊 Core Features

### Prediction Markets
- Create binary outcome markets (Yes/No questions) with customizable options
- Dynamic pricing based on liquidity parameter and vote distribution
- Automated market settlement with winner determination
- Real-time probability updates based on trading activity

### Privacy-Preserving Trading
- Encrypted vote submission using Rescue cipher
- Confidential share trading with hidden market statistics
- Zero-knowledge proof validation of trading operations
- Market statistics remain encrypted until revelation phase

### Market Mechanics
- **Liquidity Parameter**: Controls market sensitivity to trades (higher = more stable pricing)
- **Dynamic Pricing**: Uses exponential market scoring rule for fair price discovery
- **Share-based System**: Users trade shares representing proportional ownership of outcomes
- **TVL Tracking**: Total Value Locked monitoring for market health

## 🎯 Market Lifecycle

1. **Market Creation**
   - Initialize market with question and binary options
   - Set liquidity parameter for price sensitivity control
   - Create encrypted market statistics using confidential computation
   - Fund market with initial liquidity

2. **Trading Phase**
   - Users create positions and buy/sell shares with encrypted votes
   - Market prices update dynamically based on liquidity and demand
   - All trading activity remains confidential until revelation
   - Real-time TVL tracking and balance management

3. **Market Settlement**
   - Reveal final vote counts and probabilities
   - Determine winning outcome based on external result
   - Distribute rewards to winning positions
   - Claim market funds and reset positions

## 🔧 Technical Implementation

### Solana Program (`arx_predict`)

The main program handles:
- Market and user position account management
- Payment processing and vault operations
- Coordination with Arcium's confidential computing

#### Key Instructions
- `create_market` - Initialize new prediction market with question and options
- `create_user_position` - Create user position account for trading
- `buy_shares` / `sell_shares` - Trade market shares with encrypted votes
- `reveal_probs` - Expose current market probabilities and vote counts
- `settle_market` - Set winning outcome and settle the market
- `claim_rewards` - Collect winnings from settled markets
- `fund_market` / `claim_market_funds` - Manage market liquidity
- `send_payment` / `withdraw_payment` - Handle user payments and withdrawals

### Confidential Circuits (`encrypted-ixs`)

Implement the core market logic in a privacy-preserving manner:

#### Market Statistics (`init_market_stats`)
- Initialize vote counts and probabilities
- Set starting cost and liquidity parameters

#### Trading Operations (`buy_shares`, `sell_shares`)
- Update vote counts based on encrypted votes
- Calculate new probabilities using exponential market scoring
- Determine payment amounts for trades

#### Market Resolution (`reveal_market`, `reveal_probs`)
- Expose final vote counts and probabilities
- Enable market settlement and reward distribution
- Support both partial probability reveals and full market settlement

#### Reward Claims (`claim_rewards`)
- Calculate winnings based on winning outcome
- Reset user positions after settlement

### Client Utilities (`client/`)

TypeScript helpers for:
- **`arcium_helper.ts`** - Core program interactions and Arcium integration
- **`deploy.ts`** - Program deployment and setup scripts
- **`event_listener.ts`** - Real-time event monitoring and logging
- **`init_comp_defs.ts`** - Computation definition initialization
- **`setup.ts`** - Development environment setup utilities
- **`utils.ts`** - Common utility functions and helpers
- **`lmsr.ts`** - Logarithmic Market Scoring Rule implementations

## 📁 Project Structure

```
arx_predict/
├── programs/arx_predict/          # Main Solana program
│   ├── src/
│   │   ├── lib.rs                # Program entry point with all instructions
│   │   ├── states.rs             # Account data structures (Market, UserPosition)
│   │   ├── contexts/             # Instruction contexts and validation
│   │   │   ├── create_market.rs  # Market creation logic
│   │   │   ├── buy_shares.rs     # Share buying operations
│   │   │   ├── sell_shares.rs    # Share selling operations
│   │   │   ├── reveal_probs.rs   # Probability revelation
│   │   │   ├── settle_market.rs  # Market settlement
│   │   │   └── claim_rewards.rs  # Reward claiming
│   │   ├── events.rs             # Program event definitions
│   │   ├── constants.rs          # Program constants and circuit URLs
│   │   ├── errors.rs             # Error definitions
│   │   ├── macros.rs             # Custom macros
│   │   └── utils.rs              # Utility functions
├── encrypted-ixs/                 # Confidential computing circuits
│   └── src/lib.rs                # Arcis-based market logic
│       ├── MarketStats           # Encrypted market state
│       ├── UserPosition          # Encrypted user holdings
│       ├── buy_shares()          # Confidential share buying
│       ├── sell_shares()         # Confidential share selling
│       ├── reveal_market()       # Market outcome revelation
│       └── claim_rewards()       # Reward calculation
├── client/                        # TypeScript client utilities
│   ├── arcium_helper.ts          # Core program interactions
│   ├── deploy.ts                 # Program deployment scripts
│   ├── event_listener.ts         # Real-time event monitoring
│   ├── init_comp_defs.ts         # Computation definition setup
│   ├── setup.ts                  # Development environment setup
│   ├── utils.ts                  # Utility functions
│   └── lmsr.ts                   # Market scoring rule implementations
├── tests/                         # Integration tests
│   ├── arx_predict.ts            # Main test suite
│   └── arx_predict_multiple.ts   # Multi-market tests
├── migrations/                    # Deployment scripts
└── artifacts/                     # Build artifacts
```

## 🚀 Getting Started

### Prerequisites
- Rust toolchain
- Solana CLI
- Node.js and Yarn
- Arcium development environment

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd arx_predict

# Install dependencies
yarn install

# Build the program
cargo build

# Run tests
yarn test
```

### Environment Setup
1. **Configure Solana CLI** for devnet:
   ```bash
   solana config set --url devnet
   solana-keygen new --outfile ~/.config/solana/id.json
   ```

2. **Set up Arcium development environment**:
   - Configure Arcium cluster connection
   - Set up computation definitions using `yarn deploy`

3. **Deploy the program**:
   ```bash
   yarn deploy
   ```

4. **Initialize computation definitions**:
   ```bash
   ts-node client/init_comp_defs.ts
   ```

5. **Monitor events** (optional):
   ```bash
   yarn listen
   ```

## 🔑 Key Concepts

### Market Status
- **Inactive**: Market not yet open for trading
- **Active**: Market accepting trades and votes
- **Settled**: Market resolved, rewards available

### Share Trading
- Shares represent proportional ownership of outcomes
- Dynamic pricing based on current demand
- Encrypted vote submission ensures privacy

### Liquidity Parameter
- Controls how sensitive market prices are to trades
- Higher values create more stable pricing
- Lower values allow for more dramatic price movements

## 📈 Market Scoring Rule

The system uses an exponential market scoring rule (LMSR) for price discovery:

```
P(option_i) = exp(votes_i / liquidity) / Σ exp(votes_j / liquidity)
Cost = liquidity × ln(Σ exp(votes_j / liquidity))
```

### Key Features:
- **Numerical Stability**: Subtracts maximum value to prevent overflow
- **Share Scaling**: Uses `SHARES_PER_UNIT` (1,000,000) for precision
- **Liquidity Control**: Higher liquidity = more stable prices
- **Incentive Alignment**: Proper rewards for liquidity provision

### Implementation Details:
- Initial probabilities: 50/50 for binary markets
- Cost calculation includes natural logarithm scaling
- Vote counts are scaled by shares per unit for precision
- Maximum value subtraction ensures numerical stability

## 🔒 Privacy Features

- **Encrypted Votes**: User choices remain hidden during trading
- **Confidential State**: Market statistics are encrypted until revelation
- **Zero-Knowledge Proofs**: Validates operations without revealing inputs
- **Secure Settlement**: Final outcomes are computed confidentially

## 📡 Events

The program emits various events for monitoring and integration:

### Trading Events
- **`BuySharesEvent`** - Emitted when users buy shares
  - `market_id`: Market identifier
  - `status`: Success (1) or failure (0) status
  - `timestamp`: Transaction timestamp
  - `amount`: Payment amount
  - `tvl`: Total Value Locked after transaction

- **`SellSharesEvent`** - Emitted when users sell shares
  - Same structure as BuySharesEvent

### Market Events
- **`InitMarketStatsEvent`** - Emitted when market statistics are initialized
  - `market_id`: Market identifier

- **`RevealProbsEvent`** - Emitted when probabilities are revealed
  - `market_id`: Market identifier
  - `probs`: Array of probabilities for each option
  - `votes`: Array of vote counts for each option

- **`MarketSettledEvent`** - Emitted when market is settled
  - `market_id`: Market identifier
  - `winning_outcome`: The winning option (0 or 1)
  - `probs`: Final probabilities
  - `votes`: Final vote counts

### Reward Events
- **`ClaimRewardsEvent`** - Emitted when rewards are claimed
  - `market_id`: Market identifier
  - `amount`: Reward amount claimed

- **`ClaimMarketFundsEvent`** - Emitted when market funds are claimed
  - `market_id`: Market identifier
  - `amount`: Amount claimed from market

### Event Monitoring
Use the built-in event listener to monitor events in real-time:
```bash
# Listen to all events
yarn listen

# Listen to specific event types
yarn listen:buy    # Buy shares events
yarn listen:sell   # Sell shares events
yarn listen:reveal # Probability reveal events
```

## 🧪 Testing

The test suite covers:
- Market creation and management
- Share trading operations
- Payment processing
- Market settlement and rewards
- Integration with Arcium's confidential computing

Run tests with:
```bash
arcium test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details
---

## 🔧 Configuration

### Program ID
- **Program ID**: `GYP8ZjJ7eis3S8kTaGnotSiCDBJ2zphNUb1TkqD3Qknf`
- **Network**: Solana Devnet
- **USDC Mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

### Key Constants
- **Max Options**: 2 (binary markets only)
- **Max Question Length**: 50 characters
- **Max Option Length**: 20 characters
- **Shares Per Unit**: 1,000,000 (for precision)
- **Market Reveal Time**: 60 seconds

### Circuit URLs
All computation circuits are hosted on IPFS and configured in `constants.rs`:
- `init_market_stats_testnet.arcis`
- `buy_shares_testnet.arcis`
- `sell_shares_testnet.arcis`
- `reveal_market_testnet.arcis`
- `reveal_probs_testnet.arcis`
- `claim_rewards_testnet.arcis`

---

**Note**: This project is experimental and should not be used in production without thorough security audits and testing.
