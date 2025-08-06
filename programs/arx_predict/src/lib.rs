use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

mod states;
mod constants;
mod errors;
mod contexts;
mod events;
use states::*;

use constants::*;
use errors::ErrorCode;
use contexts::*;
use events::*;

declare_id!("HUB6LrbuCgDeeAFK7R1jiuqAvzqDLussz3wqkQ5rWSvc");

#[arcium_program]
pub mod arx_predict {
    use super::*;

    // INIT COMP DEF
    pub fn init_vote_stats_comp_def(ctx: Context<InitVoteStatsCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_vote_comp_def(ctx: Context<InitVoteCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_reveal_result_comp_def(ctx: Context<InitRevealResultCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    // CALLBACKS
    #[arcium_callback(encrypted_ix = "init_vote_stats")]
    pub fn init_vote_stats_callback(
        ctx: Context<InitVoteStatsCallback>,
        output: ComputationOutputs<InitVoteStatsOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(InitVoteStatsOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.market_acc.vote_state = o.ciphertexts;
        ctx.accounts.market_acc.nonce = o.nonce;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "vote")]
    pub fn vote_callback(
        ctx: Context<VoteCallback>,
        output: ComputationOutputs<VoteOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(VoteOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.market_acc.vote_state = o.field_0.ciphertexts;
        ctx.accounts.market_acc.nonce = o.field_0.nonce;
        let total_votes = o.field_1;

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;

        emit!(VoteEvent {
            timestamp: current_timestamp,
            total_votes,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "reveal_result")]
    pub fn reveal_result_callback(
        ctx: Context<RevealVotingResultCallback>,
        output: ComputationOutputs<RevealResultOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(RevealResultOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(RevealResultEvent { output: o });

        Ok(())
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        computation_offset: u64,
        id: u32,
        question: String,
        options: [String; MAX_OPTIONS],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.create_market(
            id,
            question,
            options,
            nonce,
            computation_offset,
            ctx.bumps.market_acc,
        )
    }

    pub fn vote(
        ctx: Context<Vote>,
        computation_offset: u64,
        _id: u32,
        vote: [u8; 32],
        vote_encryption_pubkey: [u8; 32],
        vote_nonce: u128,
    ) -> Result<()> {
        ctx.accounts.vote(
            vote,
            vote_encryption_pubkey,
            vote_nonce,
            computation_offset,
        )
    }

    pub fn reveal_result(
        ctx: Context<RevealVotingResult>,
        computation_offset: u64,
        id: u32,
    ) -> Result<()> {
        ctx.accounts.reveal_result(id, computation_offset)
    }
}