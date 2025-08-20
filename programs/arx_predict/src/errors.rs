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
    #[msg("Invalid liquidity parameter")]
    InvalidLiquidityParameter,
    #[msg("Empty option")]
    EmptyOption,
    #[msg("Market inactive")]
    MarketInactive,
    #[msg("Market active")]
    MarketActive,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Market not settled")]
    MarketNotSettled,
    #[msg("Market expired")]
    MarketExpired,
}
