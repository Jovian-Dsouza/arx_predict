use arcium_anchor::prelude::*;
use anchor_lang::prelude::*;
use crate::{
    constants::{COMP_DEF_OFFSET_BUY_SHARES, COMP_DEF_OFFSET_CLAIM_REWARDS, COMP_DEF_OFFSET_SELL_SHARES}, MarketAccount, UserPosition, COMP_DEF_OFFSET_INIT_MARKET_STATS, COMP_DEF_OFFSET_INIT_USER_POSITION, COMP_DEF_OFFSET_REVEAL_MARKET, COMP_DEF_OFFSET_REVEAL_PROBS, ID_CONST
};

#[callback_accounts("init_market_stats")]
#[derive(Accounts)]
pub struct InitMarketStatsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_MARKET_STATS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    /// CHECK: market_acc, checked by the callback account key passed in queue_computation
    #[account(mut)]
    pub market_acc: Account<'info, MarketAccount>,
}

#[callback_accounts("init_user_position")]
#[derive(Accounts)]
pub struct InitUserPositionCallback<'info> {
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

#[callback_accounts("reveal_market")]
#[derive(Accounts)]
pub struct RevealMarketCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_MARKET)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub market_acc: Account<'info, MarketAccount>,
}

#[callback_accounts("reveal_probs")]
#[derive(Accounts)]
pub struct RevealProbsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_PROBS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub market_acc: Account<'info, MarketAccount>,
}

#[callback_accounts("buy_shares")]
#[derive(Accounts)]
pub struct BuySharesCallback<'info> {
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

#[callback_accounts("sell_shares")]
#[derive(Accounts)]
pub struct SellSharesCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_SELL_SHARES)
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

#[callback_accounts("claim_rewards")]
#[derive(Accounts)]
pub struct ClaimRewardsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLAIM_REWARDS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub user_position_acc: Account<'info, UserPosition>,
}