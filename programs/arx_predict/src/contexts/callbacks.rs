use arcium_anchor::prelude::*;
use anchor_lang::prelude::*;
use crate::{
    constants::COMP_DEF_OFFSET_BUY_SHARES, MarketAccount, UserPosition, COMP_DEF_OFFSET_INIT_USER_POSITION, COMP_DEF_OFFSET_INIT_VOTE_STATS, COMP_DEF_OFFSET_REVEAL, COMP_DEF_OFFSET_REVEAL_PROBS, COMP_DEF_OFFSET_VOTE, ID_CONST
};

#[callback_accounts("init_vote_stats", payer)]
#[derive(Accounts)]
pub struct InitVoteStatsCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_VOTE_STATS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    /// CHECK: market_acc, checked by the callback account key passed in queue_computation
    #[account(mut)]
    pub market_acc: Account<'info, MarketAccount>,
}

#[callback_accounts("init_user_position", payer)]
#[derive(Accounts)]
pub struct InitUserPositionCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_USER_POSITION)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    /// CHECK: user_position_acc, checked by the callback account key passed in queue_computation
    #[account(mut)]
    pub user_position_acc: Account<'info, UserPosition>,
}

#[callback_accounts("vote", payer)]
#[derive(Accounts)]
pub struct VoteCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_VOTE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub market_acc: Account<'info, MarketAccount>,
    #[account(mut)]
    pub user_position_acc: Account<'info, UserPosition>,
}

#[callback_accounts("reveal_result", payer)]
#[derive(Accounts)]
pub struct RevealVotingResultCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("reveal_probs", payer)]
#[derive(Accounts)]
pub struct RevealProbsCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_PROBS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("buy_shares", payer)]
#[derive(Accounts)]
pub struct BuySharesCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_BUY_SHARES)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub market_acc: Account<'info, MarketAccount>,
    #[account(mut)]
    pub user_position_acc: Account<'info, UserPosition>,
}