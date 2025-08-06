use anchor_lang::prelude::*;
use crate::constants::*;

#[account]
#[derive(InitSpace)]
pub struct MarketAccount {
    pub bump: u8,
    // Up to MAX_OPTIONS options, each with a ciphertext tally (32 bytes each)
    pub vote_state: [[u8; 32]; MAX_OPTIONS],
    pub probs: [f64; MAX_OPTIONS],
    pub id: u32,
    pub authority: Pubkey,
    pub nonce: u128,
    #[max_len(MAX_QUESTION_LENGTH)]
    pub question: String,
    #[max_len(MAX_OPTION_LENGTH)]
    pub options: [String; MAX_OPTIONS],
    // pub created_at: u64,
}

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    pub bump: u8,
    pub shares: [[u8; 32]; MAX_OPTIONS],
    //TODO pub total_investment: [u8; 32],
    pub nonce: u128,
}