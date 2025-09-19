use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::{callbacks::InitUserPositionCallback, ErrorCode, SignerAccount, UserPosition, COMP_DEF_OFFSET_INIT_USER_POSITION, ID, ID_CONST, MAX_OPTIONS};

#[queue_computation_accounts("init_user_position", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, market_id: u32)]
pub struct CreateUserPosition<'info> {
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
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_USER_POSITION)
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
        init,
        payer = payer,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"user_position", market_id.to_le_bytes().as_ref(), payer.key().as_ref()],
        bump
    )]
    pub user_position_acc: Account<'info, UserPosition>,
}

impl<'info> CreateUserPosition<'info> {
    pub fn create_user_position(
        &mut self,
        market_id: u32,
        nonce: u128,
        computation_offset: u64,
        bump: u8,
        sign_pda_account_bump: u8,
    ) -> Result<()> {
        self.user_position_acc.bump = bump;
        self.user_position_acc.nonce = nonce;
        self.user_position_acc.shares = [[0; 32]; MAX_OPTIONS];
        self.user_position_acc.balance = 0;
        self.user_position_acc.market_id = market_id;
        let args = vec![Argument::PlaintextU128(nonce)];

        // Set the bump for the sign_pda_account
        // Note: The bump will be handled by the Arcium program
        
        // Set the bump for the sign_pda_account
        self.sign_pda_account.bump = sign_pda_account_bump;
        
        queue_computation(
            self,
            computation_offset,
            args,
            None,
            vec![InitUserPositionCallback::callback_ix(&[
                CallbackAccount {
                    pubkey: self.user_position_acc.key(),
                    is_writable: true,
                },
            ])],
        )?;

        Ok(())
    }
}