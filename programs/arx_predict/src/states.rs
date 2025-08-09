use anchor_lang::prelude::*;
use crate::constants::*;

#[account]
#[derive(InitSpace)]
pub struct MarketAccount {
    pub bump: u8,
    pub nonce: u128,
    // Up to MAX_OPTIONS options, each with a ciphertext tally (32 bytes each)
    pub vote_state: [[u8; 32]; MAX_OPTIONS],
    pub probs: [[u8; 32]; MAX_OPTIONS],
    pub id: u32,
    pub authority: Pubkey,
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
    pub nonce: u128,
    pub shares: [[u8; 32]; MAX_OPTIONS],
    pub current_payment: u64,
    //TODO pub total_investment: [u8; 32],
    
}