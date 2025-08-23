use anchor_lang::prelude::*;
use crate::constants::*;

#[account]
#[derive(InitSpace)]
pub struct MarketAccount {
    pub bump: u8,
    pub nonce: u128,
    pub vote_state: [[u8; 32]; MAX_OPTIONS],
    pub probs: [[u8; 32]; MAX_OPTIONS],
    pub cost: [u8; 32],
    pub liquidity_parameter: u64,
    pub id: u32,
    pub authority: Pubkey,
    #[max_len(MAX_QUESTION_LENGTH)]
    pub question: String,
    #[max_len(MAX_OPTION_LENGTH)]
    pub options: [String; MAX_OPTIONS],
    pub probs_revealed: [f64; MAX_OPTIONS],
    pub updated_at: u64,
    pub winning_outcome: u8,
    pub status: MarketStatus,
    pub tvl: u64,
    pub mint: Pubkey,
    pub mint_decimals: u8,
    pub votes_revealed: [u64; MAX_OPTIONS],
}

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    pub bump: u8,
    pub nonce: u128,
    pub shares: [[u8; 32]; MAX_OPTIONS],
    pub balance: u64,    
    pub market_id: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum MarketStatus {
    Inactive,
    Active,
    Settled,
}