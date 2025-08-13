# ArxPredict Architecture Documentation

## System Overview

ArxPredict is a hybrid on-chain/off-chain system that combines Solana's high-performance blockchain with Arcium's confidential computing infrastructure. This architecture enables privacy-preserving prediction markets while maintaining the security and decentralization benefits of blockchain technology.

## 🔐 Confidential Computing Flow

### 1. Computation Initialization
```rust
// User submits encrypted vote and trade request
pub fn buy_shares(
    ctx: Context<BuyShares>,
    computation_offset: u64,
    vote: [u8; 32],           // Encrypted vote
    vote_encryption_pubkey: [u8; 32],
    vote_nonce: u128,
    shares: u64,
) -> Result<()>
```

### 2. Off-Chain Processing
- Arcium network receives computation request
- Processes encrypted data using Arcis framework
- Updates market statistics confidentially
- Returns encrypted results

### 3. Result Processing
```rust
#[arcium_callback(encrypted_ix = "buy_shares")]
pub fn buy_shares_callback(
    ctx: Context<BuySharesCallback>,
    output: ComputationOutputs<BuySharesOutput>,
) -> Result<()>
```

## 📊 Data Flow Architecture

### Market Creation Flow
```
1. create_market() → Solana Program
2. init_market_stats_comp_def() → Arcium Network
3. Market statistics computed confidentially
4. Callback updates on-chain market state
```

### Trading Flow
```
1. User encrypts vote using Rescue cipher
2. buy_shares() queues computation
3. Arcium processes encrypted trade
4. Callback updates market and user positions
5. Payment processed on-chain
```

### Settlement Flow
```
1. reveal_result() exposes final outcome
2. reveal_probs() shows final probabilities
3. settle_market() sets winner
4. Users claim_rewards() for winnings
```

## 🗄️ State Management

### On-Chain State (Solana)
- **MarketAccount**: Public market metadata, encrypted statistics
- **UserPosition**: User share holdings and balance
- **Vault**: Payment processing and token management

### Off-Chain State (Arcium)
- **Vote Statistics**: Encrypted vote counts per option
- **Market Probabilities**: Dynamic pricing calculations
- **Cost Tracking**: Liquidity parameter management

### State Synchronization
- **Nonce-based**: Ensures state consistency
- **Callback-driven**: Updates triggered by computation completion
- **Atomic Updates**: Market and user state updated together

## 🔒 Privacy Architecture

### Encryption Layers
1. **Rescue Cipher**: User vote encryption
2. **Arcium Encryption**: Confidential state management
3. **Zero-Knowledge Proofs**: Operation validation

### Data Visibility
- **Public**: Market questions, options, expiry, status
- **Encrypted**: Vote counts, probabilities, costs
- **Revealed**: Final outcomes after settlement

### Privacy Guarantees
- Individual votes remain hidden during trading
- Market statistics are confidential until revelation
- User positions are private but verifiable

## ⚡ Performance Considerations

### On-Chain Optimization
- Minimal state updates during trading
- Batch processing of market operations
- Efficient account structure design

### Off-Chain Scaling
- Parallel computation processing
- Asynchronous result handling
- Optimized cryptographic operations

### Network Efficiency
- Reduced on-chain transaction volume
- Confidential computation batching
- Smart caching of computation results

## 🛡️ Security Model

### Trust Assumptions
- **Solana**: Byzantine fault tolerance
- **Arcium**: Honest majority of validators
- **Cryptography**: Computational security of encryption schemes

### Attack Vectors
- **Front-running**: Mitigated by encrypted voting
- **MEV**: Reduced through confidential state
- **Sybil Attacks**: Addressed by economic incentives

### Security Measures
- **Nonce Validation**: Prevents replay attacks
- **Account Validation**: Ensures proper authorization
- **State Consistency**: Maintains market integrity

## 🔧 Implementation Details

### Solana Program Structure
```rust
#[arcium_program]
pub mod arx_predict {
    // Computation definition initialization
    pub fn init_market_stats_comp_def(ctx: Context<InitMarketStatsCompDef>) -> Result<()>
    
    // Trading operations
    pub fn buy_shares(ctx: Context<BuyShares>, ...) -> Result<()>
    pub fn sell_shares(ctx: Context<SellShares>, ...) -> Result<()>
    
    // Market management
    pub fn create_market(ctx: Context<CreateMarket>, ...) -> Result<()>
    pub fn settle_market(ctx: Context<SettleMarket>, ...) -> Result<()>
    
    // Callback handlers
    #[arcium_callback(encrypted_ix = "buy_shares")]
    pub fn buy_shares_callback(ctx: Context<BuySharesCallback>, ...) -> Result<()>
}
```

### Arcis Circuit Structure
```rust
#[encrypted]
mod circuits {
    #[instruction]
    pub fn buy_shares(
        vote_ctxt: Enc<Shared, UserVote>,
        shares: u64,
        liquidity_parameter: u64,
        market_stats_ctxt: Enc<Mxe, MarketStats>,
        user_position_ctxt: Enc<Mxe, UserPosition>,
    ) -> (Enc<Mxe, MarketStats>, Enc<Mxe, UserPosition>, f64)
}
```

## 🔄 Integration Points

### Solana Integration
- **SPL Token**: Payment processing and vault management
- **System Program**: Account creation and management
- **Clock**: Timestamp-based operations

### Arcium Integration
- **MXE**: Multi-party execution environment
- **Computation Pool**: Task scheduling and execution
- **Mempool**: Transaction queuing and ordering

### Client Integration
- **Anchor Client**: Program interaction
- **Arcium Client**: Confidential computation management
- **Web3.js**: Blockchain connectivity

---

This architecture provides a robust foundation for privacy-preserving prediction markets while maintaining the performance and security characteristics required for production deployment.
