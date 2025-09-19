use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;
use crate::constants::{COMP_DEF_OFFSET_REVEAL_MARKET, MARKET_ACCOUNT_COST_LENGTH, MARKET_ACCOUNT_PROB_LENGTH, MARKET_ACCOUNT_VOTE_STATS_LENGTH, MARKET_ACCOUNT_VOTE_STATS_OFFSET};
use crate::SignerAccount;
use crate::{states::MarketStatus, ErrorCode, MarketAccount};
use crate::{ID, ID_CONST, callbacks::RevealMarketCallback};

#[queue_computation_accounts("reveal_market", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, id: u32)]
pub struct SettleMarket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

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
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_MARKET)
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

impl<'info> SettleMarket<'info> {
    pub fn settle_market(
        &mut self,
        computation_offset: u64,
        _id: u32,
        winner: u8,
        sign_pda_account_bump: u8,
    ) -> Result<()> {
        require!(
            self.payer.key() == self.market_acc.authority,
            ErrorCode::InvalidAuthority
        );
        require!(self.market_acc.status == MarketStatus::Active, ErrorCode::MarketActive);

        let args = vec![
            Argument::PlaintextU128(self.market_acc.nonce),
            Argument::Account(
                self.market_acc.key(),
                MARKET_ACCOUNT_VOTE_STATS_OFFSET,
                MARKET_ACCOUNT_VOTE_STATS_LENGTH
                    + MARKET_ACCOUNT_PROB_LENGTH
                    + MARKET_ACCOUNT_COST_LENGTH,
            ),
            Argument::PlaintextU8(winner),
        ];

        // Set the bump for the sign_pda_account
        // Note: The bump will be handled by the Arcium program
        
        // Set the bump for the sign_pda_account
        self.sign_pda_account.bump = sign_pda_account_bump;
        
        queue_computation(
            self,
            computation_offset,
            args,
            None,
            vec![RevealMarketCallback::callback_ix(&[
                CallbackAccount {
                    pubkey: self.market_acc.key(),
                    is_writable: true,
                },
            ])],
        )?;
        Ok(())
    }
} 