use anchor_lang::prelude::*;

#[event]
pub struct VoteEvent {
    pub timestamp: i64,
    pub total_votes: u64,
    pub amount: u64,
}

#[event]
pub struct RevealResultEvent {
    pub output: u8,
}

#[event]
pub struct RevealProbsEvent {
    pub share0: f64,
    pub share1: f64,
}

#[event]
pub struct BuySharesEvent {
    pub status: u8,
    pub timestamp: i64,
    pub amount: u64,
}


#[event]
pub struct SellSharesEvent {
    pub status: u8,
    pub timestamp: i64,
    pub amount: u64,
}

#[event]
pub struct ClaimRewardsEvent {
    pub amount: u64,
}