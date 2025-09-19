use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::{
    callbacks::RevealProbsCallback, constants::{
        COMP_DEF_OFFSET_REVEAL_PROBS, MARKET_ACCOUNT_COST_LENGTH, MARKET_ACCOUNT_PROB_LENGTH,
        MARKET_ACCOUNT_VOTE_STATS_LENGTH, MARKET_ACCOUNT_VOTE_STATS_OFFSET, MARKET_REVEAL_PROBS_TIME
    }, states::MarketStatus, ErrorCode, MarketAccount, SignerAccount, ID, ID_CONST
};

#[queue_computation_accounts("reveal_probs", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, id: u32)]
pub struct RevealProbs<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_PROBS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    /// Sign PDA account for Arcium computations
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        mut,
        seeds = [b"market", id.to_le_bytes().as_ref()],
        bump = market_acc.bump
    )]
    pub market_acc: Account<'info, MarketAccount>,
}

impl<'info> RevealProbs<'info> {
    pub fn reveal_probs(&self, id: u32, computation_offset: u64) -> Result<()> {
        require!(
            self.market_acc.status == MarketStatus::Active,
            ErrorCode::MarketActive
        );
        let current_timestamp = Clock::get()?.unix_timestamp as u64;
        require!(
            current_timestamp - self.market_acc.updated_at > MARKET_REVEAL_PROBS_TIME,
            ErrorCode::MarketProbsRevealRateLimit
        );

        let args = vec![
            Argument::PlaintextU128(self.market_acc.nonce),
            Argument::Account(
                self.market_acc.key(),
                MARKET_ACCOUNT_VOTE_STATS_OFFSET,
                MARKET_ACCOUNT_VOTE_STATS_LENGTH
                    + MARKET_ACCOUNT_PROB_LENGTH
                    + MARKET_ACCOUNT_COST_LENGTH,
            ),
        ];

        // Set the bump for the sign_pda_account
        // Note: The bump will be handled by the Arcium program
        
        // Note: We can't set the bump here since this is a &self method, not &mut self
        // The bump will be set by the Arcium program
        
        queue_computation(
            self,
            computation_offset,
            args,
            None,
            vec![RevealProbsCallback::callback_ix(&[
                CallbackAccount {
                    pubkey: self.market_acc.key(),
                    is_writable: true,
                },
            ])],
        )?;
        Ok(())
    }
}
