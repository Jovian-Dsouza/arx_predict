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
    pub updated_at: u64,
    pub expiry_at: u64,
    pub winning_outcome: u8,
    pub status: MarketStatus,
}

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    pub bump: u8,
    pub nonce: u128,
    pub shares: [[u8; 32]; MAX_OPTIONS],
    pub balance: u64,    
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum MarketStatus {
    Inactive,
    Active,
    Settled,
}