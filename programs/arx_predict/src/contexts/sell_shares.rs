use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::{callbacks::SellSharesCallback, constants::{COMP_DEF_OFFSET_SELL_SHARES, MARKET_ACCOUNT_COST_LENGTH, MARKET_ACCOUNT_PROB_LENGTH, MARKET_ACCOUNT_VOTE_STATS_LENGTH, MARKET_ACCOUNT_VOTE_STATS_OFFSET, USER_POSITION_SHARES_LENGTH, USER_POSITION_SHARES_OFFSET}, states::MarketStatus, ErrorCode, MarketAccount, SignerAccount, UserPosition, ID, ID_CONST};


#[queue_computation_accounts("sell_shares", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, _id: u32)]
pub struct SellShares<'info> {
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
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_SELL_SHARES)
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

impl<'info> SellShares<'info> {
    pub fn sell_shares(
        &mut self,
        vote: [u8; 32],
        vote_encryption_pubkey: [u8; 32],
        vote_nonce: u128,
        computation_offset: u64,
        shares: u64,
        sign_pda_account_bump: u8,
    ) -> Result<()> {
        require!(self.market_acc.status == MarketStatus::Active, ErrorCode::MarketActive);
        let args = vec![
            Argument::ArcisPubkey(vote_encryption_pubkey),
            Argument::PlaintextU128(vote_nonce),
            Argument::EncryptedBool(vote),
            Argument::PlaintextU64(shares),
            Argument::PlaintextU64(self.market_acc.liquidity_parameter),
            Argument::PlaintextU128(self.market_acc.nonce),
            Argument::Account(
                self.market_acc.key(),
                MARKET_ACCOUNT_VOTE_STATS_OFFSET,
                MARKET_ACCOUNT_VOTE_STATS_LENGTH + MARKET_ACCOUNT_PROB_LENGTH + MARKET_ACCOUNT_COST_LENGTH,
            ),
            Argument::PlaintextU128(self.user_position_acc.nonce),
            Argument::Account(
                self.user_position_acc.key(),
                USER_POSITION_SHARES_OFFSET,
                USER_POSITION_SHARES_LENGTH,
            ),
        ];

        // Set the bump for the sign_pda_account
        self.sign_pda_account.bump = sign_pda_account_bump;
        
        queue_computation(
            self,
            computation_offset,
            args,
            None,
            vec![SellSharesCallback::callback_ix(&[
                CallbackAccount {
                    pubkey: self.market_acc.key(),
                    is_writable: true,
                },
                CallbackAccount {
                    pubkey: self.user_position_acc.key(),
                    is_writable: true,
                },
            ])],
        )?;
        Ok(())
    }
} 