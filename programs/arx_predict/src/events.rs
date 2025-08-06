use anchor_lang::prelude::*;

#[event]
pub struct VoteEvent {
    pub timestamp: i64,
    pub total_votes: u64,
}

#[event]
pub struct RevealResultEvent {
    pub output: u8,
}
