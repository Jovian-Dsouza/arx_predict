use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

mod states;
mod constants;
mod errors;
mod contexts;
mod events;
mod macros;
mod utils;
use states::*;
use constants::*;
use errors::ErrorCode;
use contexts::*;
use events::*;
use utils::*;

declare_id!("7ox4o9VrNnducKJgmBFYu2yrLoYgw7dkZKH4Qjz5qUQg");

#[arcium_program]
pub mod arx_predict {
    use super::*;

    // INIT COMP DEF
    pub fn init_market_stats_comp_def(ctx: Context<InitMarketStatsCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, conditional_circuit_source!(INIT_MARKET_STATS_CIRCUIT), None)?;
        Ok(())
    }

    pub fn init_user_position_comp_def(ctx: Context<InitUserPositionCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, conditional_circuit_source!(INIT_USER_POSITION_CIRCUIT), None)?;
        Ok(())
    }

    pub fn init_buy_shares_comp_def(ctx: Context<InitBuySharesCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, conditional_circuit_source!(BUY_SHARES_CIRCUIT), None)?;
        Ok(())
    }

    pub fn init_sell_shares_comp_def(ctx: Context<InitSellSharesCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, conditional_circuit_source!(SELL_SHARES_CIRCUIT), None)?;
        Ok(())
    }

    pub fn init_reveal_result_comp_def(ctx: Context<InitRevealResultCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, conditional_circuit_source!(REVEAL_RESULT_CIRCUIT), None)?;
        Ok(())
    }

    pub fn init_reveal_probs_comp_def(ctx: Context<InitRevealProbsCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, conditional_circuit_source!(REVEAL_PROBS_CIRCUIT), None)?;
        Ok(())
    }

    pub fn init_claim_rewards_comp_def(ctx: Context<InitClaimRewardsCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, conditional_circuit_source!(CLAIM_REWARDS_CIRCUIT), None)?;
        Ok(())
    }

    // CALLBACKS
    #[arcium_callback(encrypted_ix = "init_market_stats")]
    pub fn init_market_stats_callback(
        ctx: Context<InitMarketStatsCallback>,
        output: ComputationOutputs<InitMarketStatsOutput>,
    ) -> Result<()> {
        require!(ctx.accounts.market_acc.status == MarketStatus::Active, ErrorCode::MarketActive);
        let o = match output {
            ComputationOutputs::Success(InitMarketStatsOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        ctx.accounts.market_acc.vote_state = o.ciphertexts[0..2].try_into().unwrap();
        ctx.accounts.market_acc.probs = o.ciphertexts[2..4].try_into().unwrap();
        ctx.accounts.market_acc.cost = o.ciphertexts[4].try_into().unwrap();
        ctx.accounts.market_acc.nonce = o.nonce;
        ctx.accounts.market_acc.updated_at = 0;

        emit!(InitMarketStatsEvent {
            market_id: ctx.accounts.market_acc.id,
        });

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

    #[arcium_callback(encrypted_ix = "buy_shares")]
    pub fn buy_shares_callback(
        ctx: Context<BuySharesCallback>,
        output: ComputationOutputs<BuySharesOutput>,
    ) -> Result<()> {
        require!(ctx.accounts.market_acc.status == MarketStatus::Active, ErrorCode::MarketActive);
        let o = match output {
            ComputationOutputs::Success(BuySharesOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };
        let amount = convert_f64_to_token_amount(o.field_2, ctx.accounts.market_acc.mint_decimals)?;
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;


        if ctx.accounts.user_position_acc.balance < amount {
            emit!(BuySharesEvent {
                market_id: ctx.accounts.market_acc.id,
                status: 0,
                timestamp: current_timestamp,
                amount: amount,
            });
            return Ok(()); //TODO, cant return error here because of the callback
        }
        ctx.accounts.user_position_acc.balance -= amount;
        ctx.accounts.market_acc.vote_state = o.field_0.ciphertexts[0..2].try_into().unwrap();
        ctx.accounts.market_acc.probs = o.field_0.ciphertexts[2..4].try_into().unwrap();
        ctx.accounts.market_acc.cost = o.field_0.ciphertexts[4].try_into().unwrap();
        ctx.accounts.market_acc.nonce = o.field_0.nonce;
        ctx.accounts.user_position_acc.shares = o.field_1.ciphertexts;  
        ctx.accounts.user_position_acc.nonce = o.field_1.nonce;
        ctx.accounts.market_acc.tvl += amount;
        
        emit!(BuySharesEvent {
            market_id: ctx.accounts.market_acc.id,
            status: 1,
            timestamp: current_timestamp,
            amount: amount,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "sell_shares")]
    pub fn sell_shares_callback(
        ctx: Context<SellSharesCallback>,
        output: ComputationOutputs<SellSharesOutput>,
    ) -> Result<()> {
        require!(ctx.accounts.market_acc.status == MarketStatus::Active, ErrorCode::MarketActive);
        let o = match output {
            ComputationOutputs::Success(SellSharesOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };
        let status = o.field_3;

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;


        if status == 0 { // Insufficient shares
            emit!(SellSharesEvent {
                market_id: ctx.accounts.market_acc.id,
                status: 0,
                timestamp: current_timestamp,
                amount: 0,
            });
            return Ok(()); //TODO, cant return error here because of the callback
        }
        
        let amount = convert_f64_to_token_amount(-o.field_2, ctx.accounts.market_acc.mint_decimals)?;
        ctx.accounts.user_position_acc.balance += amount;
        ctx.accounts.market_acc.vote_state = o.field_0.ciphertexts[0..2].try_into().unwrap();
        ctx.accounts.market_acc.probs = o.field_0.ciphertexts[2..4].try_into().unwrap();
        ctx.accounts.market_acc.cost = o.field_0.ciphertexts[4].try_into().unwrap();
        ctx.accounts.market_acc.nonce = o.field_0.nonce;
        ctx.accounts.user_position_acc.shares = o.field_1.ciphertexts;  
        ctx.accounts.user_position_acc.nonce = o.field_1.nonce;
        ctx.accounts.market_acc.tvl -= amount;
        
        emit!(SellSharesEvent {
            market_id: ctx.accounts.market_acc.id,
            status: 1,
            timestamp: current_timestamp,
            amount: amount,
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

        emit!(RevealResultEvent { 
            market_id: ctx.accounts.market_acc.id,
            output: o,
        });

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

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp as u64;
        ctx.accounts.market_acc.probs_revealed = o;
        ctx.accounts.market_acc.updated_at = current_timestamp;


        emit!(RevealProbsEvent { 
            market_id: ctx.accounts.market_acc.id,
            share0: o[0] as f64,
            share1: o[1] as f64,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "claim_rewards")]
    pub fn claim_rewards_callback(
        ctx: Context<ClaimRewardsCallback>,
        output: ComputationOutputs<ClaimRewardsOutput>,
    ) -> Result<()> {
        let o = match output {
            ComputationOutputs::Success(ClaimRewardsOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };
        let amount = o.field_1;
        ctx.accounts.user_position_acc.balance += amount;
        ctx.accounts.user_position_acc.shares = o.field_0.ciphertexts;  
        ctx.accounts.user_position_acc.nonce = o.field_0.nonce;
        
        
        emit!(ClaimRewardsEvent {
            market_id: ctx.accounts.user_position_acc.market_id,
            amount: amount,
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
        market_id: u32,
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.create_user_position(
            market_id,
            nonce,
            computation_offset,
            ctx.bumps.user_position_acc,
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

    pub fn sell_shares(
        ctx: Context<SellShares>,
        computation_offset: u64,
        _id: u32,
        vote: [u8; 32],
        vote_encryption_pubkey: [u8; 32],
        vote_nonce: u128,
        shares: u64,
    ) -> Result<()> {
        ctx.accounts.sell_shares(
            vote,
            vote_encryption_pubkey,
            vote_nonce,
            computation_offset,
            shares
        )
    }

    // pub fn reveal_result(
    //     ctx: Context<RevealVotingResult>,
    //     computation_offset: u64,
    //     id: u32,
    // ) -> Result<()> {
    //     ctx.accounts.reveal_result(id, computation_offset)
    // }

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

    pub fn withdraw_payment(
        ctx: Context<WithdrawPayment>,
        id: u32,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.withdraw_payment(amount, id, ctx.bumps.vault)
    }

    pub fn settle_market(
        ctx: Context<SettleMarket>,
        id: u32,
        winner: u8,
    ) -> Result<()> {
        ctx.accounts.settle_market(id, winner)
    }

    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
        computation_offset: u64,
        _id: u32,
    ) -> Result<()> {
        ctx.accounts.claim_rewards(computation_offset)
    }

    pub fn fund_market(
        ctx: Context<FundMarket>,
        _id: u32,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.fund_market(amount)
    }

}