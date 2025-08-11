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

    pub fn init_user_position_comp_def(ctx: Context<InitUserPositionCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_vote_comp_def(ctx: Context<InitVoteCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_buy_shares_comp_def(ctx: Context<InitBuySharesCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_reveal_result_comp_def(ctx: Context<InitRevealResultCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_reveal_probs_comp_def(ctx: Context<InitRevealProbsCompDef>) -> Result<()> {
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

        ctx.accounts.market_acc.vote_state = o.ciphertexts[0..2].try_into().unwrap();
        ctx.accounts.market_acc.probs = o.ciphertexts[2..4].try_into().unwrap();
        ctx.accounts.market_acc.cost = o.ciphertexts[4].try_into().unwrap();
        ctx.accounts.market_acc.nonce = o.nonce;

        Ok(())
    }

    

    #[arcium_callback(encrypted_ix = "init_user_position")]
    pub fn init_user_position_callback(
        ctx: Context<InitUserPositionCallback>,
        output: ComputationOutputs<InitUserPositionOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(InitUserPositionOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.user_position_acc.shares = o.ciphertexts;
        ctx.accounts.user_position_acc.nonce = o.nonce;

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

        ctx.accounts.market_acc.vote_state = o.field_0.ciphertexts[0..2].try_into().unwrap();
        ctx.accounts.market_acc.probs = o.field_0.ciphertexts[2..4].try_into().unwrap();
        ctx.accounts.market_acc.cost = o.field_0.ciphertexts[4].try_into().unwrap();
        ctx.accounts.market_acc.nonce = o.field_0.nonce;
        ctx.accounts.user_position_acc.shares = o.field_1.ciphertexts;  
        ctx.accounts.user_position_acc.nonce = o.field_1.nonce;
        let total_votes = o.field_2;
        let amount = o.field_3;
       

        
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;

        emit!(VoteEvent {
            timestamp: current_timestamp,
            total_votes,
            amount,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "buy_shares")]
    pub fn buy_shares_callback(
        ctx: Context<BuySharesCallback>,
        output: ComputationOutputs<BuySharesOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(BuySharesOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.market_acc.vote_state = o.field_0.ciphertexts[0..2].try_into().unwrap();
        ctx.accounts.market_acc.probs = o.field_0.ciphertexts[2..4].try_into().unwrap();
        ctx.accounts.market_acc.cost = o.field_0.ciphertexts[4].try_into().unwrap();
        ctx.accounts.market_acc.nonce = o.field_0.nonce;
        ctx.accounts.user_position_acc.shares = o.field_1.ciphertexts;  
        ctx.accounts.user_position_acc.nonce = o.field_1.nonce;
        let amount = (o.field_2 * 1e6) as u64; // TODO: Add decimals / mint check

        if ctx.accounts.user_position_acc.balance < amount {
            return Err(ErrorCode::InsufficientPayment.into());
        }
        ctx.accounts.user_position_acc.balance -= amount;
       
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;

        emit!(BuySharesEvent {
            timestamp: current_timestamp,
            amount: o.field_2,
            amount_u64: amount,
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

    #[arcium_callback(encrypted_ix = "reveal_probs")]
    pub fn reveal_probs_callback(
        ctx: Context<RevealProbsCallback>,
        output: ComputationOutputs<RevealProbsOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(RevealProbsOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(RevealProbsEvent { 
            share0: o[0] as f64,
            share1: o[1] as f64,
        });

        Ok(())
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        computation_offset: u64,
        id: u32,
        question: String,
        options: [String; MAX_OPTIONS],
        liquidity_parameter: u64,
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.create_market(
            id,
            question,
            options,
            liquidity_parameter,
            nonce,
            computation_offset,
            ctx.bumps.market_acc,
        )
    }

    pub fn create_user_position(
        ctx: Context<CreateUserPosition>,
        computation_offset: u64,
        _market_id: u32,
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.create_user_position(
            nonce,
            computation_offset,
            ctx.bumps.user_position_acc,
        )
    }

    pub fn vote(
        ctx: Context<Vote>,
        computation_offset: u64,
        _id: u32,
        vote: [u8; 32],
        vote_encryption_pubkey: [u8; 32],
        vote_nonce: u128,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.vote(
            vote,
            vote_encryption_pubkey,
            vote_nonce,
            computation_offset,
            amount
        )
    }

    pub fn buy_shares(
        ctx: Context<BuyShares>,
        computation_offset: u64,
        _id: u32,
        vote: [u8; 32],
        vote_encryption_pubkey: [u8; 32],
        vote_nonce: u128,
        shares: u64,
    ) -> Result<()> {
        ctx.accounts.buy_shares(
            vote,
            vote_encryption_pubkey,
            vote_nonce,
            computation_offset,
            shares
        )
    }

    pub fn reveal_result(
        ctx: Context<RevealVotingResult>,
        computation_offset: u64,
        id: u32,
    ) -> Result<()> {
        ctx.accounts.reveal_result(id, computation_offset)
    }

    pub fn reveal_probs(
        ctx: Context<RevealProbs>,
        computation_offset: u64,
        id: u32,
    ) -> Result<()> {
        ctx.accounts.reveal_probs(id, computation_offset)
    }

    pub fn send_payment(
        ctx: Context<SendPayment>,
        _id: u32,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.send_payment(amount)
    }

}