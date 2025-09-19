use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::{callbacks::ClaimRewardsCallback, constants::{COMP_DEF_OFFSET_CLAIM_REWARDS, USER_POSITION_SHARES_LENGTH, USER_POSITION_SHARES_OFFSET}, states::MarketStatus, ErrorCode, MarketAccount, SignerAccount, UserPosition, ID, ID_CONST};

#[queue_computation_accounts("claim_rewards", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, _id: u32)]
pub struct ClaimRewards<'info> {
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
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLAIM_REWARDS)
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
    /// CHECK: Poll authority pubkey
    #[account(
        address = market_acc.authority,
    )]
    pub authority: UncheckedAccount<'info>,
    #[account(
        seeds = [b"market", _id.to_le_bytes().as_ref()],
        bump = market_acc.bump,
        has_one = authority
    )]
    pub market_acc: Account<'info, MarketAccount>,

    #[account(
        mut,
        seeds = [b"user_position", _id.to_le_bytes().as_ref(), payer.key().as_ref()],
        bump
    )]
    pub user_position_acc: Box<Account<'info, UserPosition>>,
}

impl<'info> ClaimRewards<'info> {
    pub fn claim_rewards(
        &mut self,
        computation_offset: u64,
        sign_pda_account_bump: u8,
    ) -> Result<()> {
        require!(self.market_acc.status == MarketStatus::Settled, ErrorCode::MarketNotSettled);

        let args = vec![
            Argument::PlaintextU8(self.market_acc.winning_outcome),
            Argument::PlaintextU128(self.user_position_acc.nonce),
            Argument::Account(
                self.user_position_acc.key(),
                USER_POSITION_SHARES_OFFSET,
                USER_POSITION_SHARES_LENGTH,
            ),
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
            vec![ClaimRewardsCallback::callback_ix(&[
                CallbackAccount {
                    pubkey: self.user_position_acc.key(),
                    is_writable: true,
                },
            ])],
        )?;
        Ok(())
    }
} 