use anchor_lang::prelude::*;
use crate::MAX_OPTIONS;

#[event]
pub struct VoteEvent {
    pub timestamp: i64,
    pub total_votes: u64,
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