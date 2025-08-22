use anchor_lang::prelude::*;

#[event]
pub struct VoteEvent {
    pub market_id: u32,
    pub timestamp: i64,
    pub total_votes: u64,
    pub amount: u64,
}

#[event]
pub struct RevealResultEvent {
    pub market_id: u32,
    pub output: u8,
}

#[event]
pub struct RevealProbsEvent {
    pub market_id: u32,
    pub share0: f64,
    pub share1: f64,
}

#[event]
pub struct BuySharesEvent {
    pub market_id: u32,
    pub status: u8,
    pub timestamp: i64,
    pub amount: u64,
}


#[event]
pub struct SellSharesEvent {
    pub market_id: u32,
    pub status: u8,
    pub timestamp: i64,
    pub amount: u64,
}

#[event]
pub struct ClaimRewardsEvent {
    pub market_id: u32,
    pub amount: u64,
}

#[event]
pub struct InitMarketStatsEvent {
    pub market_id: u32,
}