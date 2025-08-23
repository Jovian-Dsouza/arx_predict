use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Invalid number of options")]
    InvalidNumOptions,
    #[msg("Cluster not set")]
    ClusterNotSet,
    #[msg("Insufficient payment")]
    InsufficientPayment,
    #[msg("liquidity parameter must >= 10")]
    InvalidLiquidityParameter,
    #[msg("Empty option")]
    EmptyOption,
    #[msg("Invalid question")]
    InvalidQuestion,
    #[msg("Market inactive")]
    MarketInactive,
    #[msg("Market active")]
    MarketActive,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Market not settled")]
    MarketNotSettled,
    #[msg("Market probs reveal rate limit")]
    MarketProbsRevealRateLimit,
    #[msg("Invalid amount: amount must be positive")]
    InvalidAmount,
    #[msg("Amount too large: exceeds maximum u64 value")]
    AmountTooLarge,
    #[msg("Market not funded")]
    MarketNotFunded,
    #[msg("Invalid mint")]
    InvalidMint,
}
