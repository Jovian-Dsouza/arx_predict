# ArxPredict - Confidential Prediction Markets on Solana

ArxPredict is a decentralized prediction market platform built on Solana that leverages Arcium's confidential computing infrastructure to enable privacy-preserving trading and voting mechanisms.

## 🏗️ Architecture Overview

This project combines traditional Solana program development with Arcium's confidential computing capabilities:

- **`programs/arx_predict/`** - Main Solana program (Anchor-based)
- **`encrypted-ixs/`** - Confidential computing circuits using Arcis framework
- **`client/`** - TypeScript client utilities for interacting with the program



## 📊 Core Features

### Prediction Markets
- Create binary outcome markets (Yes/No questions)
- Dynamic pricing based on liquidity and vote distribution
- Automated market settlement

### Privacy-Preserving Trading
- Encrypted vote submission
- Confidential share trading
- Hidden market statistics until revelation

### Market Mechanics
- **Liquidity Parameter**: Controls market sensitivity to trades
- **Dynamic Pricing**: Uses exponential market scoring rule
- **Share-based System**: Users trade shares representing outcomes

## 🎯 Market Lifecycle

1. **Market Creation**
   - Initialize market with question and options
   - Set liquidity parameter and expiry
   - Create encrypted market statistics

2. **Trading Phase**
   - Users buy/sell shares with encrypted votes
   - Market prices update based on liquidity and demand
   - All trading activity remains confidential

3. **Market Settlement**
   - Reveal final vote counts and probabilities
   - Determine winning outcome
   - Distribute rewards to winning positions

## 🔧 Technical Implementation

### Solana Program (`arx_predict`)

The main program handles:
- Market and user position account management
- Payment processing and vault operations
- Coordination with Arcium's confidential computing

#### Key Instructions
- `create_market` - Initialize new prediction market
- `buy_shares` / `sell_shares` - Trade market shares
- `reveal_result` / `reveal_probs` - Expose market outcomes
- `claim_rewards` - Collect winnings from settled markets

### Confidential Circuits (`encrypted-ixs`)

Implement the core market logic in a privacy-preserving manner:

#### Market Statistics (`init_market_stats`)
- Initialize vote counts and probabilities
- Set starting cost and liquidity parameters

#### Trading Operations (`buy_shares`, `sell_shares`)
- Update vote counts based on encrypted votes
- Calculate new probabilities using exponential market scoring
- Determine payment amounts for trades

#### Market Resolution (`reveal_result`, `reveal_probs`)
- Expose final vote counts and probabilities
- Enable market settlement and reward distribution

#### Reward Claims (`claim_rewards`)
- Calculate winnings based on winning outcome
- Reset user positions after settlement

### Client Utilities (`client/`)

TypeScript helpers for:
- Market creation and management
- Share trading operations
- Payment processing
- Integration with Arcium's computation system

## 📁 Project Structure

```
arx_predict/
├── programs/arx_predict/          # Main Solana program
│   ├── src/
│   │   ├── lib.rs                # Program entry point
│   │   ├── states.rs             # Account data structures
│   │   ├── contexts.rs           # Instruction contexts
│   │   ├── events.rs             # Program events
│   │   ├── constants.rs          # Program constants
│   │   └── errors.rs             # Error definitions
├── encrypted-ixs/                 # Confidential computing circuits
│   └── src/lib.rs                # Arcis-based market logic
├── client/                        # TypeScript client utilities
│   ├── arcium_helper.ts          # Core program interactions
│   ├── init_comp_defs.ts         # Computation definition setup
│   └── utils.ts                  # Utility functions
├── tests/                         # Integration tests
└── migrations/                    # Deployment scripts
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
1. Configure Solana cluster connection
2. Set up Arcium development environment
3. Deploy computation definitions
4. Initialize program accounts

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

The system uses an exponential market scoring rule:

```
P(option_i) = exp(votes_i / liquidity) / Σ exp(votes_j / liquidity)
Cost = liquidity × Σ exp(votes_j / liquidity)
```

This ensures:
- Proper incentive alignment
- Liquidity provision rewards
- Market efficiency

## 🔒 Privacy Features

- **Encrypted Votes**: User choices remain hidden during trading
- **Confidential State**: Market statistics are encrypted until revelation
- **Zero-Knowledge Proofs**: Validates operations without revealing inputs
- **Secure Settlement**: Final outcomes are computed confidentially

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

**Note**: This project is experimental and should not be used in production without thorough security audits and testing.
